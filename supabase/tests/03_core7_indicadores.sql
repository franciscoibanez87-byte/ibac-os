-- CORE 7 — Indicadores: resultado único por período + vista de comparación contra meta.
\set ON_ERROR_STOP on

select gen_random_uuid() as empresa_id \gset
insert into empresa (id, razon_social) values (:'empresa_id', 'Empresa de Prueba');

select gen_random_uuid() as puesto_id \gset
insert into puesto (id, empresa_id, nombre) values (:'puesto_id', :'empresa_id', 'Reclutador');

select gen_random_uuid() as indicador_id \gset
insert into indicador (id, empresa_id, nombre, unidad_medida, periodicidad) values
  (:'indicador_id', :'empresa_id', 'Tiempo de contratación', 'días', 'mensual');

insert into kpi_puesto (puesto_id, nombre, meta_valor, meta_unidad, indicador_id) values
  (:'puesto_id', 'Tiempo de contratación', 20, 'días', :'indicador_id');

insert into resultado_indicador (indicador_id, periodo_inicio, periodo_fin, valor) values
  (:'indicador_id', '2026-09-01', '2026-09-30', 25),
  (:'indicador_id', '2026-10-01', '2026-10-31', 18);

select test_assert(
  (select resultado_valor from kpi_puesto_resultado_reciente where puesto_id = :'puesto_id') = 18,
  'CORE7: kpi_puesto_resultado_reciente muestra el resultado del período MÁS RECIENTE'
);

select test_assert(
  (select meta_valor from kpi_puesto_resultado_reciente where puesto_id = :'puesto_id') = 20,
  'CORE7: kpi_puesto_resultado_reciente conserva la meta del puesto sin mezclarla con el resultado'
);

select test_assert_raises(
  format('insert into resultado_indicador (indicador_id, periodo_inicio, periodo_fin, valor) values (%L, ''2026-10-01'', ''2026-10-31'', 99)', :'indicador_id'),
  'CORE7: uq_resultado_indicador_periodo rechaza un segundo resultado para el mismo período'
);
