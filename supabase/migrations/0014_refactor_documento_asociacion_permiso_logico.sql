-- ============================================================================
-- FIX — documento_asociacion y documento_permiso apuntan al documento
-- LÓGICO, no a una versión puntual
-- ============================================================================
-- Hallazgo de la auditoría de 2026-10-29: ambas tablas referenciaban
-- `documento.id` (una versión específica). Al subir una nueva versión con
-- `subir_nueva_version_documento`, las asociaciones/permisos de la
-- versión anterior se quedaban apuntando a esa versión ya no vigente —
-- no "seguían" al documento. Para evidencia de cumplimiento (CORE 8) eso
-- es correcto (la evidencia debe fijarse a la versión exacta que se
-- entregó), pero para "¿qué documentos tiene asociados esta persona?" o
-- "¿quién tiene permiso sobre este documento?" lo esperable es que
-- sobreviva a nuevas versiones.
--
-- Esta migración cambia ambas tablas para referenciar
-- `documento.documento_logico_id` en vez de `documento.id`. Esto sigue
-- siendo una FK válida porque `documento_logico_id` de cualquier versión
-- es, por construcción (ver `subir_documento`), siempre igual al `id` de
-- la fila versión 1 — una fila que siempre existe.
--
-- Se agregan vistas de conveniencia para resolver "la versión vigente"
-- sin tener que repetir el join en cada consulta de la capa de aplicación.
-- ============================================================================

do $$
begin
  if exists (select 1 from documento_asociacion) then
    raise exception 'documento_asociacion tiene % fila(s) existente(s); esta migración asume la tabla vacía y hace DROP COLUMN sin backfill.', (select count(*) from documento_asociacion);
  end if;
  if exists (select 1 from documento_permiso) then
    raise exception 'documento_permiso tiene % fila(s) existente(s); esta migración asume la tabla vacía y hace DROP COLUMN sin backfill.', (select count(*) from documento_permiso);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- documento_asociacion
-- ----------------------------------------------------------------------------
alter table documento_asociacion drop constraint documento_asociacion_documento_id_fkey;
alter table documento_asociacion drop constraint uq_documento_asociacion;
drop index if exists idx_documento_asociacion_documento;

alter table documento_asociacion rename column documento_id to documento_logico_id;
alter table documento_asociacion add foreign key (documento_logico_id) references documento(id) on delete cascade;
alter table documento_asociacion add constraint uq_documento_asociacion unique (documento_logico_id, entidad_tipo, entidad_id);

create index if not exists idx_documento_asociacion_documento on documento_asociacion(documento_logico_id);

comment on table documento_asociacion is 'Gestión Documental — asociación de un documento LÓGICO (sobrevive a nuevas versiones) a cualquier entidad del sistema (referencia lógica, no FK tipado).';
comment on column documento_asociacion.documento_logico_id is 'Referencia a documento.documento_logico_id (vía documento.id de la v1). Para la versión vigente, resolver con la vista documento_asociacion_vigente.';

-- ----------------------------------------------------------------------------
-- documento_permiso
-- ----------------------------------------------------------------------------
alter table documento_permiso drop constraint documento_permiso_documento_id_fkey;
drop index if exists idx_documento_permiso_documento;

alter table documento_permiso rename column documento_id to documento_logico_id;
alter table documento_permiso add foreign key (documento_logico_id) references documento(id) on delete cascade;

create index if not exists idx_documento_permiso_documento on documento_permiso(documento_logico_id);

comment on table documento_permiso is 'Gestión Documental — permisos sobre un documento LÓGICO (sobrevive a nuevas versiones), otorgados por puesto o por persona específica.';
comment on column documento_permiso.documento_logico_id is 'Referencia a documento.documento_logico_id (vía documento.id de la v1).';

-- ----------------------------------------------------------------------------
-- Vistas de conveniencia: resuelven directamente a la versión vigente,
-- para no repetir el join documento_logico_id -> documento(vigente=true)
-- en cada consulta de la capa de aplicación.
-- ----------------------------------------------------------------------------
create or replace view documento_asociacion_vigente as
select
  da.id,
  da.documento_logico_id,
  da.entidad_tipo,
  da.entidad_id,
  da.creado_en,
  d.id as documento_id,
  d.version,
  d.nombre,
  d.categoria,
  d.mime_type,
  d.storage_path
from documento_asociacion da
join documento d on d.documento_logico_id = da.documento_logico_id and d.vigente = true;

comment on view documento_asociacion_vigente is 'Gestión Documental — asociaciones resueltas a la versión actualmente vigente de cada documento.';

create or replace view documento_permiso_vigente as
select
  dp.id,
  dp.documento_logico_id,
  dp.puesto_id,
  dp.persona_id,
  dp.nivel_acceso,
  dp.creado_en,
  d.id as documento_id,
  d.version,
  d.nombre
from documento_permiso dp
join documento d on d.documento_logico_id = dp.documento_logico_id and d.vigente = true;

comment on view documento_permiso_vigente is 'Gestión Documental — permisos resueltos a la versión actualmente vigente de cada documento.';
