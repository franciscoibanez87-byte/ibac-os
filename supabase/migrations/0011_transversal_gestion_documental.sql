-- ============================================================================
-- Servicio Transversal — Gestión Documental
-- ============================================================================
-- Aprobado explícitamente como servicio transversal de infraestructura (no
-- es un CORE ni un subsistema comercial), con 7 capacidades nombradas:
-- almacenamiento, versionamiento, metadatos, clasificación, asociación,
-- permisos, trazabilidad. Consumido por CORE 3 → 4 → 5 → 6 → 8.
--
-- Hasta ahora, varios COREs referenciaban documentos solo por UUID lógico
-- sin tabla real detrás (cumplimiento_instancia.evidencia_documento_id,
-- evidencia_asistencia.evidencia_documento_id). Esta migración construye
-- esa tabla y conecta esas FKs pendientes.
--
-- Decisión de diseño: el versionamiento de `documento` NO reutiliza el
-- Motor de Objeto Gobernado. Ese motor modela un ciclo de vida normativo
-- (borrador→revisión→aprobado→publicado→archivado) para contenido como
-- política/procedimiento/banda salarial/contrato. Un documento almacenado
-- (un PDF, una imagen, un comprobante) no tiene ese ciclo — solo tiene
-- versiones sucesivas donde la más reciente está "vigente". Se modela con
-- su propio patrón version/vigente, más simple y propio de su naturaleza.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Almacenamiento + versionamiento + metadatos + clasificación
-- ----------------------------------------------------------------------------
-- `documento_logico_id` agrupa todas las versiones de "el mismo documento".
-- La primera versión usa su propio `id` como `documento_logico_id` (lo fija
-- la función `subir_documento`, nunca el cliente). Solo una versión por
-- `documento_logico_id` puede estar vigente a la vez.
create table if not exists documento (
  id uuid primary key default gen_random_uuid(),
  documento_logico_id uuid not null,
  version integer not null default 1,
  vigente boolean not null default true,

  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null,
  descripcion text,
  categoria text, -- clasificación: ej. "comprobante_imss", "incapacidad", "politica_firmada"
  mime_type text,
  storage_path text not null, -- clave/ruta en el storage (ej. Supabase Storage bucket key)
  tamano_bytes bigint,
  metadatos jsonb not null default '{}'::jsonb,

  subido_por uuid, -- referencia lógica a persona(id)
  motivo_nueva_version text, -- obligatorio desde la versión 2 (ver CHECK)

  creado_en timestamptz not null default now(),

  constraint chk_documento_version check (version >= 1),
  constraint chk_documento_motivo_version check (version = 1 or motivo_nueva_version is not null)
);

create index if not exists idx_documento_empresa on documento(empresa_id);
create index if not exists idx_documento_logico on documento(documento_logico_id);
create index if not exists idx_documento_categoria on documento(categoria);

-- Solo una versión vigente por documento lógico.
create unique index if not exists uq_documento_una_vigente
  on documento(documento_logico_id)
  where vigente = true;

comment on table documento is 'Gestión Documental (transversal) — almacenamiento + versionamiento + metadatos + clasificación. Solo una versión por documento_logico_id puede estar vigente.';

-- ----------------------------------------------------------------------------
-- Trazabilidad — bitácora de eventos sobre documentos. Se crea antes que
-- las funciones de abajo porque ambas escriben en ella.
-- ----------------------------------------------------------------------------
create type documento_tipo_evento as enum ('subido', 'version_nueva', 'descargado', 'acceso_denegado', 'eliminado');

create table if not exists documento_evento (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documento(id) on delete cascade,
  tipo_evento documento_tipo_evento not null,
  actor_id uuid, -- referencia lógica a persona(id); null si fue automatizado
  detalle text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_documento_evento_documento on documento_evento(documento_id);
create index if not exists idx_documento_evento_fecha on documento_evento(creado_en);

comment on table documento_evento is 'Gestión Documental — trazabilidad: bitácora de eventos sobre cada documento (subida, nueva versión, descarga, acceso denegado, eliminación).';

-- ----------------------------------------------------------------------------
-- Funciones atómicas — única vía soportada para crear/revisar un documento.
-- ----------------------------------------------------------------------------
create or replace function subir_documento(
  p_empresa_id uuid,
  p_nombre text,
  p_storage_path text,
  p_subido_por uuid default null,
  p_descripcion text default null,
  p_categoria text default null,
  p_mime_type text default null,
  p_tamano_bytes bigint default null,
  p_metadatos jsonb default '{}'::jsonb
) returns documento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_documento documento;
begin
  insert into documento (
    id, documento_logico_id, version, vigente,
    empresa_id, nombre, descripcion, categoria, mime_type, storage_path,
    tamano_bytes, metadatos, subido_por
  ) values (
    v_id, v_id, 1, true,
    p_empresa_id, p_nombre, p_descripcion, p_categoria, p_mime_type, p_storage_path,
    p_tamano_bytes, p_metadatos, p_subido_por
  )
  returning * into v_documento;

  insert into documento_evento (documento_id, tipo_evento, actor_id, detalle)
  values (v_id, 'subido', p_subido_por, 'Versión 1');

  return v_documento;
end;
$$;

comment on function subir_documento is 'Gestión Documental — crea la versión 1 de un documento nuevo (documento_logico_id = su propio id).';

create or replace function subir_nueva_version_documento(
  p_documento_logico_id uuid,
  p_storage_path text,
  p_motivo_nueva_version text,
  p_subido_por uuid default null,
  p_nombre text default null,
  p_descripcion text default null,
  p_categoria text default null,
  p_mime_type text default null,
  p_tamano_bytes bigint default null,
  p_metadatos jsonb default null
) returns documento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anterior documento;
  v_nueva documento;
begin
  select * into v_anterior
  from documento
  where documento_logico_id = p_documento_logico_id and vigente = true
  for update;

  if v_anterior.id is null then
    raise exception 'No existe una versión vigente para documento_logico_id = %', p_documento_logico_id;
  end if;

  if p_motivo_nueva_version is null then
    raise exception 'motivo_nueva_version es obligatorio al revisar un documento existente';
  end if;

  update documento set vigente = false where id = v_anterior.id;

  insert into documento (
    documento_logico_id, version, vigente,
    empresa_id, nombre, descripcion, categoria, mime_type, storage_path,
    tamano_bytes, metadatos, subido_por, motivo_nueva_version
  ) values (
    p_documento_logico_id, v_anterior.version + 1, true,
    v_anterior.empresa_id,
    coalesce(p_nombre, v_anterior.nombre),
    coalesce(p_descripcion, v_anterior.descripcion),
    coalesce(p_categoria, v_anterior.categoria),
    coalesce(p_mime_type, v_anterior.mime_type),
    p_storage_path,
    p_tamano_bytes,
    coalesce(p_metadatos, v_anterior.metadatos),
    p_subido_por,
    p_motivo_nueva_version
  )
  returning * into v_nueva;

  insert into documento_evento (documento_id, tipo_evento, actor_id, detalle)
  values (v_nueva.id, 'version_nueva', p_subido_por, p_motivo_nueva_version);

  return v_nueva;
end;
$$;

comment on function subir_nueva_version_documento is 'Gestión Documental — revisa atómicamente un documento existente: cierra la versión vigente y crea la siguiente.';

-- ----------------------------------------------------------------------------
-- 2) Asociación — vincular un documento a cualquier entidad del sistema.
-- ----------------------------------------------------------------------------
-- No se usa un FK tipado único porque la entidad asociada puede ser de
-- cualquier CORE (persona, contrato, política, obligación de cumplimiento,
-- etc.) — es una referencia lógica, igual que otras referencias
-- cross-CORE ya existentes en el proyecto (ej. `atendida_por` en
-- alerta_cumplimiento). La integridad se verifica en la capa de aplicación.
create table if not exists documento_asociacion (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documento(id) on delete cascade,
  entidad_tipo text not null, -- ej. 'persona', 'contrato', 'politica', 'obligacion_cumplimiento'
  entidad_id uuid not null, -- referencia lógica a esa entidad
  creado_en timestamptz not null default now(),

  constraint uq_documento_asociacion unique (documento_id, entidad_tipo, entidad_id)
);

create index if not exists idx_documento_asociacion_documento on documento_asociacion(documento_id);
create index if not exists idx_documento_asociacion_entidad on documento_asociacion(entidad_tipo, entidad_id);

comment on table documento_asociacion is 'Gestión Documental — asociación de un documento a cualquier entidad del sistema (referencia lógica, no FK tipado: la entidad puede ser de cualquier CORE).';

-- ----------------------------------------------------------------------------
-- 3) Permisos — quién puede acceder a un documento.
-- ----------------------------------------------------------------------------
create type documento_nivel_acceso as enum ('lectura', 'escritura');

create table if not exists documento_permiso (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documento(id) on delete cascade,
  puesto_id uuid references puesto(id) on delete cascade, -- permiso otorgado por rol/puesto
  persona_id uuid references persona(id) on delete cascade, -- o permiso otorgado a una persona específica
  nivel_acceso documento_nivel_acceso not null default 'lectura',
  creado_en timestamptz not null default now(),

  constraint chk_documento_permiso_sujeto check (
    (puesto_id is not null and persona_id is null) or (puesto_id is null and persona_id is not null)
  )
);

create index if not exists idx_documento_permiso_documento on documento_permiso(documento_id);

comment on table documento_permiso is 'Gestión Documental — permisos de acceso a un documento, otorgados por puesto o por persona específica (exactamente uno de los dos).';

-- ----------------------------------------------------------------------------
-- Conectar las FKs lógicas pendientes de CORE 8 a esta tabla.
-- ----------------------------------------------------------------------------
alter table cumplimiento_instancia
  add constraint fk_cumplimiento_instancia_documento foreign key (evidencia_documento_id) references documento(id) on delete set null;

alter table evidencia_asistencia
  add constraint fk_evidencia_asistencia_documento foreign key (evidencia_documento_id) references documento(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table documento enable row level security;
alter table documento_asociacion enable row level security;
alter table documento_permiso enable row level security;
alter table documento_evento enable row level security;

create policy "authenticated_read_documento" on documento for select to authenticated using (true);
create policy "authenticated_read_documento_asociacion" on documento_asociacion for select to authenticated using (true);
create policy "authenticated_read_documento_permiso" on documento_permiso for select to authenticated using (true);
create policy "authenticated_read_documento_evento" on documento_evento for select to authenticated using (true);

-- Nota de privacidad: documento puede almacenar comprobantes de
-- incapacidad u otra evidencia sensible (vía CORE 8). Igual que
-- persona/contrato/evidencia_asistencia, la policy de arriba es un
-- placeholder de desarrollo; antes de producción debe restringirse por
-- rol y por los permisos declarados en documento_permiso, no "cualquier
-- autenticado lee todo".
