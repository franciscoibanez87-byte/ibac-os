-- Motor de Objeto Gobernado (ciclo de vida) + CORE 5 (Políticas) + CORE 6 (Procedimientos).
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as autor_id \gset
insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values (:'autor_id', :'empresa_id', 'Ana', 'López', 'activo');

-- ---------------------------------------------------------------------------
-- Ciclo de vida genérico: no se puede publicar sin aprobar antes.
-- ---------------------------------------------------------------------------
select (crear_version_objeto_gobernado('politica', :'autor_id')).id as objeto_v1_id \gset

select test_assert(
  (select estado from objeto_gobernado where id = :'objeto_v1_id') = 'borrador',
  'OBJETO_GOBERNADO: nace en borrador'
);

select test_assert_raises(
  format('select publicar_objeto_gobernado(%L::uuid)', :'objeto_v1_id'),
  'OBJETO_GOBERNADO: no se puede publicar sin aprobar primero'
);

select aprobar_objeto_gobernado(:'objeto_v1_id', :'autor_id');
select publicar_objeto_gobernado(:'objeto_v1_id');

select test_assert(
  (select estado from objeto_gobernado where id = :'objeto_v1_id') = 'publicado',
  'OBJETO_GOBERNADO: aprobar + publicar deja el objeto publicado'
);

-- Nueva versión sin motivo -> debe fallar.
select test_assert_raises(
  format('select crear_version_objeto_gobernado(''politica'', %L::uuid, %L::uuid, null)', :'autor_id', :'objeto_v1_id'),
  'OBJETO_GOBERNADO: crear nueva versión de un objeto existente exige motivo_nueva_version'
);

-- ---------------------------------------------------------------------------
-- CORE 5 — Política: el contenido vive en `politica`, el ciclo de vida en objeto_gobernado.
-- ---------------------------------------------------------------------------
insert into politica (objeto_gobernado_id, empresa_id, nombre, cuerpo) values (:'objeto_v1_id', :'empresa_id', 'Política de Vacaciones', 'Cuerpo de la política.');

select test_assert(
  (select p.nombre from politica p join objeto_gobernado og on og.id = p.objeto_gobernado_id where og.id = :'objeto_v1_id') = 'Política de Vacaciones',
  'CORE5: política enlazada correctamente a su objeto_gobernado'
);

-- Un procedimiento no puede apuntar, por error, al objeto_gobernado de una política (FK tipada).
select test_assert_raises(
  format(
    'insert into procedimiento (objeto_gobernado_id, empresa_id, nombre) values (%L, %L, ''Procedimiento inválido'')',
    :'objeto_v1_id', :'empresa_id'
  ),
  'CORE6: la FK tipada rechaza un procedimiento apuntando al objeto_gobernado de una política'
);

-- ---------------------------------------------------------------------------
-- CORE 6 — Procedimiento con pasos ordenados.
-- ---------------------------------------------------------------------------
select (crear_version_objeto_gobernado('procedimiento', :'autor_id')).id as objeto_proc_id \gset
insert into procedimiento (objeto_gobernado_id, empresa_id, nombre) values (:'objeto_proc_id', :'empresa_id', 'Proceso de Contratación');

select id as procedimiento_id from procedimiento where objeto_gobernado_id = :'objeto_proc_id' \gset

insert into procedimiento_paso (procedimiento_id, orden, titulo) values
  (:'procedimiento_id', 1, 'Publicar vacante'),
  (:'procedimiento_id', 2, 'Entrevistar candidatos');

select test_assert_raises(
  format('insert into procedimiento_paso (procedimiento_id, orden, titulo) values (%L, 1, ''Paso duplicado'')', :'procedimiento_id'),
  'CORE6: uq_procedimiento_paso_orden rechaza dos pasos con el mismo número de orden'
);

select test_assert(
  (select count(*) from procedimiento_paso where procedimiento_id = :'procedimiento_id') = 2,
  'CORE6: el procedimiento queda con sus 2 pasos válidos'
);
