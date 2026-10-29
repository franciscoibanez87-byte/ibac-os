-- ============================================================================
-- Entidad Transversal — EventoMovimiento
-- ============================================================================
-- Aprobado como corrección a una fisura detectada: alta, baja, reingreso,
-- promoción, transferencia, cambio de plaza, cambio contractual son
-- distintas vistas del MISMO hecho (un movimiento de capital humano). Se
-- registra una sola vez aquí; CORE 1, CORE 3 y CORE 4 lo consumen por
-- referencia — ninguno genera su propia versión del mismo hecho.
--
-- `asignacion.evento_movimiento_id` quedó pendiente desde CORE 1
-- (0001_core1_estructura.sql) esperando esta tabla. Esta migración la
-- construye y conecta esa FK.
-- ============================================================================

create type evento_movimiento_tipo as enum (
  'alta',
  'baja',
  'reingreso',
  'promocion',
  'transferencia',
  'cambio_plaza',
  'cambio_contractual'
);

create table if not exists evento_movimiento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  persona_id uuid not null references persona(id) on delete restrict,
  tipo evento_movimiento_tipo not null,

  fecha_efectiva date not null,
  motivo text,

  -- Referencian el "antes/después" del movimiento cuando aplica. No todos
  -- los tipos usan todos los campos: una 'alta' no tiene plaza_anterior_id;
  -- una 'baja' no tiene plaza_nueva_id; un 'cambio_contractual' usa los
  -- campos de contrato y deja los de plaza en null.
  plaza_anterior_id uuid references plaza(id) on delete set null,
  plaza_nueva_id uuid references plaza(id) on delete set null,
  contrato_anterior_id uuid references contrato(id) on delete set null,
  contrato_nuevo_id uuid references contrato(id) on delete set null,

  autorizado_por uuid, -- referencia lógica a persona(id)
  creado_en timestamptz not null default now(),

  constraint chk_evento_movimiento_alta check (tipo <> 'alta' or plaza_anterior_id is null),
  constraint chk_evento_movimiento_baja check (tipo <> 'baja' or plaza_nueva_id is null)
);

create index if not exists idx_evento_movimiento_empresa on evento_movimiento(empresa_id);
create index if not exists idx_evento_movimiento_persona on evento_movimiento(persona_id);
create index if not exists idx_evento_movimiento_tipo on evento_movimiento(tipo);
create index if not exists idx_evento_movimiento_fecha on evento_movimiento(fecha_efectiva);

comment on table evento_movimiento is 'Entidad transversal — registra una sola vez cada movimiento de capital humano (alta, baja, reingreso, promoción, transferencia, cambio de plaza, cambio contractual). CORE 1/3/4 lo consumen por referencia, nunca lo duplican.';

-- ----------------------------------------------------------------------------
-- Conectar la FK pendiente desde CORE 1.
-- ----------------------------------------------------------------------------
alter table asignacion
  add constraint fk_asignacion_evento_movimiento foreign key (evento_movimiento_id) references evento_movimiento(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table evento_movimiento enable row level security;

create policy "authenticated_read_evento_movimiento" on evento_movimiento for select to authenticated using (true);
