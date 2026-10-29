-- EventoMovimiento: checks de alta/baja + la FK pendiente de asignacion.
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as unidad_id \gset
insert into unidad_organizacional (id, empresa_id, nombre, tipo) values (:'unidad_id', :'empresa_id', 'RH', 'area');

select gen_random_uuid() as puesto_id \gset
insert into puesto (id, empresa_id, nombre) values (:'puesto_id', :'empresa_id', 'Reclutador');

select gen_random_uuid() as persona_id \gset
insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values (:'persona_id', :'empresa_id', 'Ana', 'López', 'activo');

select gen_random_uuid() as plaza_a_id \gset
select gen_random_uuid() as plaza_b_id \gset
insert into plaza (id, empresa_id, unidad_organizacional_id, puesto_id, estado) values
  (:'plaza_a_id', :'empresa_id', :'unidad_id', :'puesto_id', 'ocupada'),
  (:'plaza_b_id', :'empresa_id', :'unidad_id', :'puesto_id', 'ocupada');

select gen_random_uuid() as evento_alta_id \gset
insert into evento_movimiento (id, empresa_id, persona_id, tipo, fecha_efectiva, plaza_nueva_id) values
  (:'evento_alta_id', :'empresa_id', :'persona_id', 'alta', '2026-01-15', :'plaza_a_id');

select gen_random_uuid() as evento_cambio_id \gset
insert into evento_movimiento (id, empresa_id, persona_id, tipo, fecha_efectiva, plaza_anterior_id, plaza_nueva_id) values
  (:'evento_cambio_id', :'empresa_id', :'persona_id', 'cambio_plaza', '2026-10-01', :'plaza_a_id', :'plaza_b_id');

insert into asignacion (plaza_id, persona_id, tipo, estatus, fecha_inicio, evento_movimiento_id) values
  (:'plaza_b_id', :'persona_id', 'titular', 'activa', '2026-10-01', :'evento_cambio_id');

select test_assert(
  (select evento_movimiento_id from asignacion where plaza_id = :'plaza_b_id') = :'evento_cambio_id'::uuid,
  'EVENTOS: la FK asignacion.evento_movimiento_id queda conectada correctamente'
);

select test_assert_raises(
  format(
    'insert into evento_movimiento (empresa_id, persona_id, tipo, fecha_efectiva, plaza_anterior_id, plaza_nueva_id) values (%L, %L, ''alta'', ''2026-01-15'', %L, %L)',
    :'empresa_id', :'persona_id', :'plaza_a_id', :'plaza_b_id'
  ),
  'EVENTOS: chk_evento_movimiento_alta rechaza una alta con plaza_anterior_id'
);

select test_assert_raises(
  format(
    'insert into evento_movimiento (empresa_id, persona_id, tipo, fecha_efectiva, plaza_anterior_id, plaza_nueva_id) values (%L, %L, ''baja'', ''2026-12-31'', %L, %L)',
    :'empresa_id', :'persona_id', :'plaza_a_id', :'plaza_b_id'
  ),
  'EVENTOS: chk_evento_movimiento_baja rechaza una baja con plaza_nueva_id'
);

-- Una 'baja' válida: solo plaza_anterior_id, sin plaza_nueva_id.
insert into evento_movimiento (empresa_id, persona_id, tipo, fecha_efectiva, plaza_anterior_id) values
  (:'empresa_id', :'persona_id', 'baja', '2026-12-31', :'plaza_b_id');

select test_assert(
  (select count(*) from evento_movimiento where empresa_id = :'empresa_id' and tipo = 'baja') = 1,
  'EVENTOS: una baja sin plaza_nueva_id se registra correctamente'
);
