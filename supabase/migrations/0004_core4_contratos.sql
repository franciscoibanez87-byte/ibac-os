-- ============================================================================
-- CORE 4 — Contratos
-- ============================================================================
-- Fuente ÚNICA de verdad salarial. Regla crítica explícita del diseño:
-- "todo cambio salarial genera una nueva versión contractual; nunca se
-- modifica silenciosamente el salario histórico."
--
-- Mismo patrón de versionado por vigencia que banda_salarial (CORE 2) y
-- asignacion (CORE 1): una fila por versión, nunca se actualiza el
-- salario in place — se cierra la versión vigente (vigente_hasta) y se
-- inserta una nueva.
-- ============================================================================

create type contrato_tipo as enum ('indeterminado', 'determinado', 'por_obra', 'periodo_prueba', 'capacitacion_inicial');
create type contrato_modalidad as enum ('presencial', 'remoto', 'hibrido');
create type contrato_jornada as enum ('diurna', 'nocturna', 'mixta', 'por_hora');
create type contrato_periodicidad_pago as enum ('semanal', 'quincenal', 'mensual');

create table if not exists contrato (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references persona(id) on delete restrict,
  empresa_id uuid not null references empresa(id) on delete restrict,

  -- Versionado: cada fila es una versión histórica. version=1 es la
  -- primera; una nueva versión SIEMPRE se inserta, nunca se edita el
  -- salario de una versión ya creada.
  version integer not null,
  motivo_modificacion text, -- obligatorio a partir de version 2 (ver CHECK abajo)

  tipo_contrato contrato_tipo not null,
  modalidad contrato_modalidad not null,
  jornada_pactada contrato_jornada not null,
  periodicidad_pago contrato_periodicidad_pago not null,

  salario_pactado numeric(12,2) not null,
  moneda text not null default 'MXN',

  condiciones_contractuales text, -- texto libre / jsonb si se requiere estructura más adelante

  fecha_inicio date not null,
  fecha_fin date, -- null para indeterminado; obligatorio para determinado/por_obra

  vigente_desde date not null,
  vigente_hasta date, -- null = esta es la versión vigente actual

  creado_en timestamptz not null default now(),

  constraint chk_contrato_version_motivo check (version = 1 or motivo_modificacion is not null),
  constraint chk_contrato_vigencia check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  constraint chk_contrato_fechas check (fecha_fin is null or fecha_fin >= fecha_inicio),
  constraint uq_contrato_persona_version unique (persona_id, version)
);

create index if not exists idx_contrato_persona on contrato(persona_id);
create index if not exists idx_contrato_empresa on contrato(empresa_id);

-- Una persona no puede tener dos versiones de contrato vigentes al mismo
-- tiempo — mismo patrón que banda_salarial y asignacion.
create unique index if not exists uq_contrato_una_vigente_por_persona
  on contrato(persona_id)
  where vigente_hasta is null;

comment on table contrato is 'CORE 4 — fuente ÚNICA de verdad salarial. Nunca se edita el salario de una versión existente; todo cambio inserta una nueva versión.';
comment on column contrato.version is 'Secuencial por persona, empieza en 1. Incrementar en cada cambio contractual relevante (incluyendo cambios salariales).';

-- ----------------------------------------------------------------------------
-- Vista derivada: historial_salarial
-- ----------------------------------------------------------------------------
-- Esto reemplaza lo que en el diseño original hubiera sido un campo o
-- tabla de "historial salarial" dentro de Persona. Por decisión explícita
-- de arquitectura, Persona NO almacena esto: se DERIVA leyendo las
-- versiones de Contrato. Esta vista es esa derivación.
-- ----------------------------------------------------------------------------
create or replace view historial_salarial as
select
  c.persona_id,
  c.version,
  c.salario_pactado,
  c.moneda,
  c.vigente_desde,
  c.vigente_hasta,
  c.motivo_modificacion,
  (c.vigente_hasta is null) as es_version_vigente
from contrato c
order by c.persona_id, c.version;

comment on view historial_salarial is 'CORE 3+4 — historial salarial DERIVADO de las versiones de Contrato. Persona nunca almacena salario propio; esta vista es la única forma correcta de consultar el historial.';

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table contrato enable row level security;

create policy "authenticated_read_contrato" on contrato for select to authenticated using (true);

-- Nota de privacidad: igual que persona, contrato es altamente sensible
-- (salario real). La policy de arriba es un placeholder de desarrollo;
-- antes de producción debe restringirse por rol (ej. RH/Nómina/Dirección),
-- nunca "cualquier autenticado lee todos los salarios de la empresa".

-- ----------------------------------------------------------------------------
-- Función: registrar_nueva_version_contrato
-- ----------------------------------------------------------------------------
-- Encapsula, de forma ATÓMICA, la única manera correcta de cambiar un
-- contrato: cierra la versión vigente (vigente_hasta) e inserta la
-- siguiente versión en una sola transacción. Hacerlo como dos llamadas
-- sueltas desde el cliente dejaría una ventana donde la persona queda sin
-- versión vigente, o peor, permitiría que algo edite el salario de la
-- versión anterior in place. SECURITY DEFINER + search_path fijo para que
-- solo esta función (no clientes arbitrarios) pueda cerrar/abrir versiones.
-- ----------------------------------------------------------------------------
create or replace function registrar_nueva_version_contrato(
  p_persona_id uuid,
  p_empresa_id uuid,
  p_motivo_modificacion text,
  p_tipo_contrato contrato_tipo,
  p_modalidad contrato_modalidad,
  p_jornada_pactada contrato_jornada,
  p_periodicidad_pago contrato_periodicidad_pago,
  p_salario_pactado numeric,
  p_moneda text,
  p_condiciones_contractuales text,
  p_fecha_inicio date,
  p_fecha_fin date,
  p_vigente_desde date
) returns contrato
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version integer;
  v_nueva contrato;
  v_tenia_version_previa boolean;
begin
  select exists(select 1 from contrato where persona_id = p_persona_id) into v_tenia_version_previa;

  -- motivo_modificacion solo es obligatorio a partir de la segunda
  -- versión (misma regla que el CHECK de la tabla: version=1 puede no
  -- tener motivo, porque no está "modificando" nada todavía).
  if v_tenia_version_previa and p_motivo_modificacion is null then
    raise exception 'motivo_modificacion es obligatorio al registrar una nueva versión de un contrato ya existente';
  end if;

  -- Cierra la versión vigente actual, si existe.
  update contrato
  set vigente_hasta = p_vigente_desde - interval '1 day'
  where persona_id = p_persona_id
    and vigente_hasta is null;

  select coalesce(max(version), 0) + 1 into v_version
  from contrato
  where persona_id = p_persona_id;

  insert into contrato (
    persona_id, empresa_id, version, motivo_modificacion,
    tipo_contrato, modalidad, jornada_pactada, periodicidad_pago,
    salario_pactado, moneda, condiciones_contractuales,
    fecha_inicio, fecha_fin, vigente_desde, vigente_hasta
  ) values (
    p_persona_id, p_empresa_id, v_version, p_motivo_modificacion,
    p_tipo_contrato, p_modalidad, p_jornada_pactada, p_periodicidad_pago,
    p_salario_pactado, p_moneda, p_condiciones_contractuales,
    p_fecha_inicio, p_fecha_fin, p_vigente_desde, null
  )
  returning * into v_nueva;

  return v_nueva;
end;
$$;

comment on function registrar_nueva_version_contrato is 'CORE 4 — única vía soportada para cambiar un contrato (incluyendo salario). Cierra la versión vigente e inserta la siguiente de forma atómica.';
