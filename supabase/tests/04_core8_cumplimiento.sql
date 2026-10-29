-- CORE 8 — Cumplimiento: cadena de control, período único, vigencia de evidencia de asistencia.
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as persona_id \gset
insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values (:'persona_id', :'empresa_id', 'Ana', 'López', 'activo');

select gen_random_uuid() as obligacion_id \gset
insert into obligacion_cumplimiento (id, empresa_id, nombre, periodicidad, riesgo_nivel_inherente) values
  (:'obligacion_id', :'empresa_id', 'Pago de cuotas IMSS', 'mensual', 'alto');

select gen_random_uuid() as instancia_id \gset
insert into cumplimiento_instancia (id, obligacion_id, periodo_inicio, periodo_fin, fecha_limite, responsable_persona_id, estatus, riesgo_nivel) values
  (:'instancia_id', :'obligacion_id', '2026-10-01', '2026-10-31', '2026-11-17', :'persona_id', 'pendiente', 'alto');

update cumplimiento_instancia set accion_realizada = 'Pago realizado en línea', fecha_accion = now(), estatus = 'cumplido' where id = :'instancia_id';

select test_assert(
  (select estatus from cumplimiento_instancia where id = :'instancia_id') = 'cumplido',
  'CORE8: la cadena de control registra la acción y actualiza el estatus'
);

select test_assert_raises(
  format('insert into cumplimiento_instancia (obligacion_id, periodo_inicio, periodo_fin, fecha_limite, estatus) values (%L, ''2026-10-01'', ''2026-10-31'', ''2026-11-18'', ''pendiente'')', :'obligacion_id'),
  'CORE8: uq_cumplimiento_instancia_periodo rechaza una segunda instancia para el mismo período'
);

insert into evidencia_asistencia (persona_id, fecha, tipo_evento, vigencia_periodo_inicio, vigencia_periodo_fin) values
  (:'persona_id', '2026-10-20', 'vacaciones', '2026-10-20', '2026-10-24');

select test_assert_raises(
  format('insert into evidencia_asistencia (persona_id, fecha, tipo_evento, vigencia_periodo_inicio, vigencia_periodo_fin) values (%L, ''2026-11-01'', ''incapacidad'', ''2026-11-10'', ''2026-11-01'')', :'persona_id'),
  'CORE8: chk_evidencia_asistencia_vigencia rechaza un rango de vigencia invertido'
);
