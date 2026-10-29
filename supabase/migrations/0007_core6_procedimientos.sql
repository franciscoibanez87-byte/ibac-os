-- ============================================================================
-- CORE 6 — Procedimientos
-- ============================================================================
-- Ciclo de vida vía Motor de Objeto Gobernado (0005), igual que CORE 5.
--
-- Frontera explícita con CORE 8 (Cumplimiento), tal como quedó decidida:
--   Procedimiento = CÓMO se ejecuta algo (esta tabla).
--   Cumplimiento  = DEMOSTRAR que se cumplió (CORE 8, aún no construido).
-- Ejemplo dado en el diseño original: Procedimiento = proceso de
-- contratación (los pasos); Cumplimiento = contrato firmado + documentos +
-- evidencia de que esos pasos realmente ocurrieron. Esta migración NO
-- incluye nada de evidencia/cumplimiento — eso es CORE 8.
-- ============================================================================

create table if not exists procedimiento (
  id uuid primary key default gen_random_uuid(),

  tipo_objeto text not null generated always as ('procedimiento') stored,
  objeto_gobernado_id uuid not null unique,

  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null,
  objetivo text, -- para qué existe el procedimiento

  -- Opcional: qué política (versión específica) implementa o desarrolla
  -- este procedimiento. No es obligatorio — hay procedimientos puramente
  -- operativos sin una política formal detrás.
  politica_relacionada_id uuid references politica(id) on delete set null,

  creado_en timestamptz not null default now(),

  foreign key (objeto_gobernado_id, tipo_objeto) references objeto_gobernado(id, tipo_objeto) on delete restrict
);

create index if not exists idx_procedimiento_empresa on procedimiento(empresa_id);
create index if not exists idx_procedimiento_politica on procedimiento(politica_relacionada_id);

comment on table procedimiento is 'CORE 6 — el CÓMO. No confundir con CORE 8 (Cumplimiento), que demuestra que el procedimiento se ejecutó realmente.';

-- ----------------------------------------------------------------------------
-- Pasos del procedimiento — normalizado en vez de JSONB para mantener
-- consistencia con el resto del esquema y permitir referenciar al puesto
-- responsable de cada paso con una FK real.
-- ----------------------------------------------------------------------------
create table if not exists procedimiento_paso (
  id uuid primary key default gen_random_uuid(),
  procedimiento_id uuid not null references procedimiento(id) on delete cascade,
  orden integer not null,
  titulo text not null,
  descripcion text,
  responsable_puesto_id uuid references puesto(id) on delete set null,

  creado_en timestamptz not null default now(),

  constraint uq_procedimiento_paso_orden unique (procedimiento_id, orden)
);

create index if not exists idx_procedimiento_paso_procedimiento on procedimiento_paso(procedimiento_id);
create index if not exists idx_procedimiento_paso_responsable on procedimiento_paso(responsable_puesto_id);

comment on table procedimiento_paso is 'CORE 6 — pasos ordenados de un procedimiento, cada uno opcionalmente asignado a un puesto responsable (CORE 2).';

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table procedimiento enable row level security;
alter table procedimiento_paso enable row level security;

create policy "authenticated_read_procedimiento" on procedimiento for select to authenticated using (true);
create policy "authenticated_read_procedimiento_paso" on procedimiento_paso for select to authenticated using (true);
