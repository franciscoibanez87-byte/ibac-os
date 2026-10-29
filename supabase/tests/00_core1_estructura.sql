-- CORE 1 — Estructura: creación básica + uq_plaza_un_titular_activo.
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as unidad_id \gset
insert into unidad_organizacional (id, empresa_id, nombre, tipo) values (:'unidad_id', :'empresa_id', 'RH', 'area');

select gen_random_uuid() as puesto_id \gset
insert into puesto (id, empresa_id, nombre) values (:'puesto_id', :'empresa_id', 'Reclutador');

select gen_random_uuid() as plaza_id \gset
insert into plaza (id, empresa_id, unidad_organizacional_id, puesto_id, estado) values
  (:'plaza_id', :'empresa_id', :'unidad_id', :'puesto_id', 'ocupada');

select gen_random_uuid() as persona_a_id \gset
select gen_random_uuid() as persona_b_id \gset
insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values
  (:'persona_a_id', :'empresa_id', 'Ana', 'López', 'activo'),
  (:'persona_b_id', :'empresa_id', 'Beto', 'Ruiz', 'activo');

insert into asignacion (plaza_id, persona_id, tipo, estatus, fecha_inicio) values
  (:'plaza_id', :'persona_a_id', 'titular', 'activa', '2026-01-01');

select test_assert(
  (select count(*) from asignacion where plaza_id = :'plaza_id' and estatus = 'activa') = 1,
  'CORE1: la asignación titular se crea correctamente'
);

select test_assert_raises(
  format(
    'insert into asignacion (plaza_id, persona_id, tipo, estatus, fecha_inicio) values (%L, %L, ''titular'', ''activa'', ''2026-01-01'')',
    :'plaza_id', :'persona_b_id'
  ),
  'CORE1: uq_plaza_un_titular_activo rechaza un segundo titular activo en la misma plaza'
);

-- Cerrar la primera asignación debe permitir una nueva sin problema.
update asignacion set estatus = 'finalizada', fecha_fin = '2026-06-30' where plaza_id = :'plaza_id' and persona_id = :'persona_a_id';
insert into asignacion (plaza_id, persona_id, tipo, estatus, fecha_inicio) values (:'plaza_id', :'persona_b_id', 'titular', 'activa', '2026-07-01');

select test_assert(
  (select count(*) from asignacion where plaza_id = :'plaza_id' and estatus = 'activa') = 1,
  'CORE1: tras cerrar la asignación anterior, la nueva titular se crea sin conflicto'
);
