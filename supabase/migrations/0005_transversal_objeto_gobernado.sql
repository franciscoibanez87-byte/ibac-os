-- ============================================================================
-- SERVICIO TRANSVERSAL — Motor de Objeto Gobernado
-- ============================================================================
-- Ciclo de vida genérico: regla → versión → aprobación → vigencia →
-- publicación. CORE 5 (Políticas) y CORE 6 (Procedimientos) lo reutilizan
-- en vez de implementar cada uno su propio mecanismo de versionado.
--
-- Nota de arquitectura (honesta, no silenciada): CORE 2 (banda_salarial) y
-- CORE 4 (contrato) ya tienen SU PROPIO patrón de versionado por vigencia,
-- construido antes de que este motor existiera. Según la documentación de
-- arquitectura, el Motor de Objeto Gobernado es consumido por
-- "CORE 2 → 4 → 5 → 6" — es decir, en estricto rigor, banda_salarial y
-- contrato deberían apoyarse en este motor también. No los estoy
-- refactorizando en esta migración sin autorización explícita: ambos ya
-- funcionan, están probados, y contrato en particular tiene invariantes
-- financieras adicionales (motivo obligatorio desde v2, función atómica
-- dedicada) que valdría la pena preservar en cualquier migración futura.
-- Queda señalado como decisión pendiente, no como inconsistencia ignorada.
--
-- Diseño de referencia polimórfica: en vez de una FK polimórfica clásica
-- (tipo_objeto + objeto_id sin integridad referencial real), este motor
-- usa el patrón de "FK tipada": objeto_gobernado tiene
-- UNIQUE(id, tipo_objeto), y cada tabla satélite (politica, procedimiento)
-- declara su propia columna tipo_objeto como constante generada y hace
-- FK compuesta (objeto_gobernado_id, tipo_objeto) -> (id, tipo_objeto).
-- Esto da integridad referencial real Y garantiza que una política nunca
-- pueda apuntar, por error, al objeto_gobernado de un procedimiento.
-- ============================================================================

create type objeto_gobernado_estado as enum ('borrador', 'en_revision', 'aprobado', 'publicado', 'archivado');

create table if not exists objeto_gobernado (
  id uuid primary key default gen_random_uuid(),

  -- Agrupa todas las versiones del MISMO objeto lógico (ej. todas las
  -- versiones de "Política de Vacaciones"). Estable a través de versiones;
  -- `id` en cambio identifica esta fila/versión puntual.
  objeto_logico_id uuid not null,
  version integer not null,

  tipo_objeto text not null check (tipo_objeto in ('politica', 'procedimiento')),

  estado objeto_gobernado_estado not null default 'borrador',

  autor_id uuid not null, -- referencia lógica a persona(id) — quien redactó esta versión
  fecha_creacion timestamptz not null default now(),

  aprobado_por uuid, -- referencia lógica a persona(id)
  fecha_aprobacion timestamptz,

  motivo_nueva_version text, -- obligatorio a partir de version 2 (ver CHECK)

  vigente_desde date,
  vigente_hasta date,

  constraint uq_objeto_gobernado_logico_version unique (objeto_logico_id, version),
  constraint uq_objeto_gobernado_id_tipo unique (id, tipo_objeto),
  constraint chk_objeto_gobernado_version_motivo check (version = 1 or motivo_nueva_version is not null),
  constraint chk_objeto_gobernado_vigencia check (vigente_hasta is null or vigente_desde is null or vigente_hasta >= vigente_desde),
  constraint chk_objeto_gobernado_aprobacion check (
    (estado in ('aprobado', 'publicado', 'archivado')) = (aprobado_por is not null and fecha_aprobacion is not null)
    or estado in ('borrador', 'en_revision')
  )
);

create index if not exists idx_objeto_gobernado_logico on objeto_gobernado(objeto_logico_id);
create index if not exists idx_objeto_gobernado_tipo on objeto_gobernado(tipo_objeto);

-- A lo sumo una versión publicada y vigente por objeto lógico.
create unique index if not exists uq_objeto_gobernado_una_vigente
  on objeto_gobernado(objeto_logico_id)
  where estado = 'publicado' and vigente_hasta is null;

comment on table objeto_gobernado is 'Servicio transversal — ciclo de vida genérico regla->version->aprobacion->vigencia->publicacion, reutilizado por CORE 5 y CORE 6.';

-- ----------------------------------------------------------------------------
-- Funciones del ciclo de vida. Son la ÚNICA vía soportada para mover un
-- objeto gobernado de un estado a otro — nunca hacer `update` directo de
-- `estado`/`vigente_desde`/`vigente_hasta` desde el cliente.
-- ----------------------------------------------------------------------------

-- Crea la primera versión (objeto_logico_id = null) o una nueva versión de
-- un objeto lógico existente (objeto_logico_id provisto). Siempre nace en
-- estado 'borrador'.
create or replace function crear_version_objeto_gobernado(
  p_tipo_objeto text,
  p_autor_id uuid,
  p_objeto_logico_id uuid default null,
  p_motivo_nueva_version text default null
) returns objeto_gobernado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objeto_logico_id uuid;
  v_version integer;
  v_nueva objeto_gobernado;
begin
  if p_objeto_logico_id is null then
    v_objeto_logico_id := gen_random_uuid();
    v_version := 1;
  else
    if not exists (select 1 from objeto_gobernado where objeto_logico_id = p_objeto_logico_id) then
      raise exception 'objeto_logico_id % no existe; omite el parámetro para crear un objeto nuevo', p_objeto_logico_id;
    end if;
    if p_motivo_nueva_version is null then
      raise exception 'motivo_nueva_version es obligatorio al crear una nueva versión de un objeto existente';
    end if;
    v_objeto_logico_id := p_objeto_logico_id;
    select max(version) + 1 into v_version from objeto_gobernado where objeto_logico_id = v_objeto_logico_id;
  end if;

  insert into objeto_gobernado (objeto_logico_id, version, tipo_objeto, autor_id, motivo_nueva_version)
  values (v_objeto_logico_id, v_version, p_tipo_objeto, p_autor_id, p_motivo_nueva_version)
  returning * into v_nueva;

  return v_nueva;
end;
$$;

comment on function crear_version_objeto_gobernado is 'Crea un objeto gobernado nuevo (borrador v1) o una nueva versión de uno existente. No publica ni aprueba.';

-- Aprueba una versión en borrador/en_revision.
create or replace function aprobar_objeto_gobernado(
  p_id uuid,
  p_aprobado_por uuid
) returns objeto_gobernado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_actual objeto_gobernado_estado;
  v_resultado objeto_gobernado;
begin
  select estado into v_estado_actual from objeto_gobernado where id = p_id;

  if v_estado_actual is null then
    raise exception 'objeto_gobernado % no existe', p_id;
  end if;

  if v_estado_actual not in ('borrador', 'en_revision') then
    raise exception 'solo se puede aprobar un objeto en borrador o en_revision (estado actual: %)', v_estado_actual;
  end if;

  update objeto_gobernado
  set estado = 'aprobado', aprobado_por = p_aprobado_por, fecha_aprobacion = now()
  where id = p_id
  returning * into v_resultado;

  return v_resultado;
end;
$$;

-- Publica una versión ya aprobada, y cierra automáticamente la versión
-- previamente vigente del mismo objeto lógico (si existe).
create or replace function publicar_objeto_gobernado(
  p_id uuid,
  p_vigente_desde date default current_date
) returns objeto_gobernado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_actual objeto_gobernado_estado;
  v_objeto_logico_id uuid;
  v_resultado objeto_gobernado;
begin
  select estado, objeto_logico_id into v_estado_actual, v_objeto_logico_id
  from objeto_gobernado where id = p_id;

  if v_estado_actual is null then
    raise exception 'objeto_gobernado % no existe', p_id;
  end if;

  if v_estado_actual <> 'aprobado' then
    raise exception 'solo se puede publicar un objeto ya aprobado (estado actual: %)', v_estado_actual;
  end if;

  -- Cierra la versión previamente vigente del mismo objeto lógico.
  update objeto_gobernado
  set vigente_hasta = p_vigente_desde - interval '1 day', estado = 'archivado'
  where objeto_logico_id = v_objeto_logico_id
    and estado = 'publicado'
    and vigente_hasta is null;

  update objeto_gobernado
  set estado = 'publicado', vigente_desde = p_vigente_desde, vigente_hasta = null
  where id = p_id
  returning * into v_resultado;

  return v_resultado;
end;
$$;

comment on function publicar_objeto_gobernado is 'Única vía para publicar. Cierra y archiva automáticamente la versión previamente vigente del mismo objeto lógico.';

-- Archiva explícitamente (sin que medie una nueva versión) — ej. una
-- política que se da de baja sin reemplazo.
create or replace function archivar_objeto_gobernado(
  p_id uuid,
  p_vigente_hasta date default current_date
) returns objeto_gobernado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultado objeto_gobernado;
begin
  update objeto_gobernado
  set estado = 'archivado', vigente_hasta = p_vigente_hasta
  where id = p_id and estado = 'publicado'
  returning * into v_resultado;

  if v_resultado is null then
    raise exception 'solo se puede archivar un objeto publicado, o el id % no existe', p_id;
  end if;

  return v_resultado;
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table objeto_gobernado enable row level security;

create policy "authenticated_read_objeto_gobernado" on objeto_gobernado for select to authenticated using (true);
