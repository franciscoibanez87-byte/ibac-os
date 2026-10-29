-- Gestión Documental: versionado propio, asociación/permiso al documento
-- lógico (fix de 0014), y los rechazos de subir_nueva_version_documento.
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as persona_id \gset
insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values (:'persona_id', :'empresa_id', 'Ana', 'López', 'activo');

select (subir_documento(:'empresa_id', 'Comprobante IMSS', 'docs/imss-v1.pdf', :'persona_id')).documento_logico_id as doc_logico_id \gset

select test_assert(
  (select version from documento where documento_logico_id = :'doc_logico_id' and vigente = true) = 1,
  'DOCUMENTOS: subir_documento crea la v1 como vigente'
);

insert into documento_asociacion (documento_logico_id, entidad_tipo, entidad_id) values (:'doc_logico_id', 'persona', :'persona_id');
insert into documento_permiso (documento_logico_id, persona_id, nivel_acceso) values (:'doc_logico_id', :'persona_id', 'lectura');

select test_assert_raises(
  format('select subir_nueva_version_documento(%L::uuid, ''docs/x.pdf'', null)', :'doc_logico_id'),
  'DOCUMENTOS: subir_nueva_version_documento exige motivo_nueva_version'
);

select test_assert_raises(
  'select subir_nueva_version_documento(gen_random_uuid(), ''docs/x.pdf'', ''motivo cualquiera'')',
  'DOCUMENTOS: subir_nueva_version_documento rechaza un documento_logico_id inexistente'
);

select subir_nueva_version_documento(:'doc_logico_id', 'docs/imss-v2.pdf', 'Escaneo de mejor calidad');

select test_assert(
  (select count(*) from documento where documento_logico_id = :'doc_logico_id') = 2,
  'DOCUMENTOS: la nueva versión se agrega sin reemplazar la fila anterior'
);

select test_assert(
  (select count(*) from documento where documento_logico_id = :'doc_logico_id' and vigente = true) = 1,
  'DOCUMENTOS: solo una versión queda vigente tras la revisión'
);

-- El fix de 0014: la asociación y el permiso NO se duplican ni quedan
-- huérfanos — una sola fila cada uno, resuelta a la versión vigente.
select test_assert(
  (select count(*) from documento_asociacion where documento_logico_id = :'doc_logico_id') = 1,
  'DOCUMENTOS: la asociación sigue siendo 1 sola fila tras la nueva versión'
);

select test_assert(
  (select version from documento_asociacion_vigente where documento_logico_id = :'doc_logico_id') = 2,
  'DOCUMENTOS: documento_asociacion_vigente resuelve automáticamente a la v2'
);

select test_assert(
  (select version from documento_permiso_vigente where documento_logico_id = :'doc_logico_id') = 2,
  'DOCUMENTOS: documento_permiso_vigente resuelve automáticamente a la v2'
);

-- Permiso sin puesto NI persona -> debe fallar el CHECK.
select test_assert_raises(
  format('insert into documento_permiso (documento_logico_id) values (%L)', :'doc_logico_id'),
  'DOCUMENTOS: chk_documento_permiso_sujeto rechaza un permiso sin puesto ni persona'
);
