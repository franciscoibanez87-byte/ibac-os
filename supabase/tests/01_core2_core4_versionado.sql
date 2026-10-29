-- CORE 2 (banda_salarial) y CORE 4 (contrato) — versionado vía Motor de
-- Objeto Gobernado (refactor 0008) + el fix de integridad de 0013.
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as unidad_id \gset
insert into unidad_organizacional (id, empresa_id, nombre, tipo) values (:'unidad_id', :'empresa_id', 'RH', 'area');

select gen_random_uuid() as puesto_id \gset
insert into puesto (id, empresa_id, nombre) values (:'puesto_id', :'empresa_id', 'Reclutador');

select gen_random_uuid() as persona_id \gset
insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values (:'persona_id', :'empresa_id', 'Ana', 'López', 'activo');

-- ---------------------------------------------------------------------------
-- banda_salarial
-- ---------------------------------------------------------------------------
select (registrar_banda_salarial(:'puesto_id', 15000, 25000, :'persona_id')).id as banda_v1_id \gset

select test_assert(
  (select count(*) from banda_salarial bs join objeto_gobernado og on og.id = bs.objeto_gobernado_id
     where bs.puesto_id = :'puesto_id' and og.estado = 'publicado' and og.vigente_hasta is null) = 1,
  'CORE2: registrar_banda_salarial crea una banda vigente'
);

select (registrar_banda_salarial(:'puesto_id', 16000, 27000, :'persona_id', p_motivo_nueva_version := 'Revisión anual', p_vigente_desde := current_date + 1)).id as banda_v2_id \gset

select test_assert(
  (select count(*) from banda_salarial bs join objeto_gobernado og on og.id = bs.objeto_gobernado_id
     where bs.puesto_id = :'puesto_id' and og.estado = 'publicado' and og.vigente_hasta is null) = 1,
  'CORE2: una nueva versión deja exactamente 1 banda vigente (la anterior se archiva)'
);

select test_assert(
  (select estado from objeto_gobernado og join banda_salarial bs on bs.objeto_gobernado_id = og.id where bs.id = :'banda_v1_id') = 'archivado',
  'CORE2: la versión anterior de la banda queda archivada'
);

-- ---------------------------------------------------------------------------
-- contrato
-- ---------------------------------------------------------------------------
select (registrar_contrato(:'persona_id', :'empresa_id', 'indeterminado', 'presencial', 'diurna', 'quincenal', 15000, :'persona_id')).id as contrato_v1_id \gset

select test_assert(
  (select count(*) from contrato c join objeto_gobernado og on og.id = c.objeto_gobernado_id
     where c.persona_id = :'persona_id' and og.estado = 'publicado' and og.vigente_hasta is null) = 1,
  'CORE4: registrar_contrato crea un contrato vigente'
);

select (registrar_contrato(:'persona_id', :'empresa_id', 'indeterminado', 'presencial', 'diurna', 'quincenal', 17000, :'persona_id',
  p_motivo_nueva_version := 'Aumento por desempeño', p_vigente_desde := current_date + 1)).id as contrato_v2_id \gset

select test_assert(
  (select count(*) from contrato c join objeto_gobernado og on og.id = c.objeto_gobernado_id
     where c.persona_id = :'persona_id' and og.estado = 'publicado' and og.vigente_hasta is null) = 1,
  'CORE4: una nueva versión deja exactamente 1 contrato vigente'
);

select test_assert(
  (select salario_pactado from contrato where id = :'contrato_v2_id') = 17000,
  'CORE4: el salario de la versión vigente es el de la revisión más reciente'
);

-- vigente_desde <= la vigente_desde de la versión actualmente vigente -> debe fallar (fix de 0008).
select test_assert_raises(
  format(
    'select registrar_contrato(%L::uuid, %L::uuid, ''indeterminado'', ''presencial'', ''diurna'', ''quincenal'', 18000, %L::uuid, p_motivo_nueva_version := ''motivo'', p_vigente_desde := current_date)',
    :'persona_id', :'empresa_id', :'persona_id'
  ),
  'CORE4: publicar_objeto_gobernado rechaza vigente_desde no posterior a la versión vigente actual'
);

-- historial_salarial debe reflejar ambas versiones, con solo la v2 vigente.
select test_assert(
  (select count(*) from historial_salarial where persona_id = :'persona_id') = 2,
  'CORE4: historial_salarial tiene las 2 versiones del contrato'
);

select test_assert(
  (select count(*) from historial_salarial where persona_id = :'persona_id' and es_version_vigente) = 1,
  'CORE4: historial_salarial marca exactamente 1 versión como vigente'
);
