-- ============================================================================
-- FIX — Integridad "una vigente por persona/puesto" en contrato y banda_salarial
-- ============================================================================
-- Hallazgo de la auditoría de 2026-10-29: el refactor de 0008 quitó
-- `uq_contrato_una_vigente_por_persona` y `uq_banda_una_vigente_por_puesto`
-- (que garantizaban en la BD "una persona/puesto no puede tener dos
-- versiones vigentes a la vez") y las sustituyó por
-- `uq_objeto_gobernado_una_vigente`, que es única por `objeto_logico_id` —
-- NO por `persona_id`/`puesto_id`. Nada impedía que dos lineages
-- independientes (dos objeto_logico_id distintos) quedaran ambos
-- "publicado y vigente" para la misma persona o el mismo puesto.
--
-- Por qué no se puede resolver con un índice único declarativo: la
-- vigencia vive en objeto_gobernado (estado + vigente_hasta), pero
-- persona_id/puesto_id viven en las tablas satélite (contrato,
-- banda_salarial), y el enlace satélite->objeto_gobernado se crea DESPUÉS
-- de publicar (ver registrar_contrato/registrar_banda_salarial en 0008:
-- primero se publica el objeto_gobernado, luego se inserta la fila
-- satélite). Un índice parcial cruzando ambas tablas no es expresable
-- declarativamente en Postgres.
--
-- Solución de dos capas dentro de las mismas funciones:
-- 1) `pg_advisory_xact_lock` al entrar, con clave = persona_id/puesto_id.
--    Serializa cualquier llamada concurrente para la MISMA persona/puesto
--    (se libera solo al terminar la transacción) — cierra la ventana de
--    carrera donde dos llamadas simultáneas podrían leer "sin lineage
--    previo" y crear dos lineages paralelos.
-- 2) Aserción explícita después de insertar: si por cualquier razón
--    quedaran dos filas vigentes para la misma persona/puesto, la
--    transacción completa se revierte con un mensaje claro, en vez de
--    dejar el dato corrupto en silencio.
-- ============================================================================

create or replace function registrar_banda_salarial(
  p_puesto_id uuid,
  p_salario_min numeric,
  p_salario_max numeric,
  p_autor_id uuid,
  p_salario_medio numeric default null,
  p_moneda text default 'MXN',
  p_motivo_nueva_version text default null,
  p_vigente_desde date default current_date
) returns banda_salarial
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objeto_logico_id uuid;
  v_objeto_gobernado objeto_gobernado;
  v_nueva banda_salarial;
  v_conteo_vigentes integer;
begin
  -- Serializa cualquier otra llamada concurrente para este mismo puesto.
  -- Se libera automáticamente al final de la transacción (commit o rollback).
  perform pg_advisory_xact_lock(hashtext('banda_salarial:' || p_puesto_id::text));

  select og.objeto_logico_id into v_objeto_logico_id
  from banda_salarial bs
  join objeto_gobernado og on og.id = bs.objeto_gobernado_id
  where bs.puesto_id = p_puesto_id
  order by og.version desc
  limit 1;

  v_objeto_gobernado := crear_version_objeto_gobernado('banda_salarial', p_autor_id, v_objeto_logico_id, p_motivo_nueva_version);
  v_objeto_gobernado := aprobar_objeto_gobernado(v_objeto_gobernado.id, p_autor_id);
  v_objeto_gobernado := publicar_objeto_gobernado(v_objeto_gobernado.id, p_vigente_desde);

  insert into banda_salarial (puesto_id, salario_min, salario_medio, salario_max, moneda, objeto_gobernado_id)
  values (p_puesto_id, p_salario_min, p_salario_medio, p_salario_max, p_moneda, v_objeto_gobernado.id)
  returning * into v_nueva;

  -- Defensa en profundidad: con el advisory lock esto nunca debería
  -- dispararse, pero si lo hace es preferible abortar con un mensaje claro
  -- que dejar dos bandas vigentes para el mismo puesto.
  select count(*) into v_conteo_vigentes
  from banda_salarial bs
  join objeto_gobernado og on og.id = bs.objeto_gobernado_id
  where bs.puesto_id = p_puesto_id
    and og.estado = 'publicado'
    and og.vigente_hasta is null;

  if v_conteo_vigentes > 1 then
    raise exception 'integridad violada: % bandas salariales vigentes simultáneas para puesto_id = % (se esperaba máximo 1)', v_conteo_vigentes, p_puesto_id;
  end if;

  return v_nueva;
end;
$$;

comment on function registrar_banda_salarial is 'CORE 2 — única vía soportada para crear o revisar una banda salarial. Serializa por puesto_id (advisory lock) y verifica que quede como máximo una banda vigente por puesto.';

create or replace function registrar_contrato(
  p_persona_id uuid,
  p_empresa_id uuid,
  p_tipo_contrato contrato_tipo,
  p_modalidad contrato_modalidad,
  p_jornada_pactada contrato_jornada,
  p_periodicidad_pago contrato_periodicidad_pago,
  p_salario_pactado numeric,
  p_autor_id uuid,
  p_moneda text default 'MXN',
  p_condiciones_contractuales text default null,
  p_fecha_inicio date default current_date,
  p_fecha_fin date default null,
  p_motivo_nueva_version text default null,
  p_vigente_desde date default current_date
) returns contrato
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objeto_logico_id uuid;
  v_objeto_gobernado objeto_gobernado;
  v_nueva contrato;
  v_conteo_vigentes integer;
begin
  -- Serializa cualquier otra llamada concurrente para esta misma persona.
  perform pg_advisory_xact_lock(hashtext('contrato:' || p_persona_id::text));

  select og.objeto_logico_id into v_objeto_logico_id
  from contrato c
  join objeto_gobernado og on og.id = c.objeto_gobernado_id
  where c.persona_id = p_persona_id
  order by og.version desc
  limit 1;

  v_objeto_gobernado := crear_version_objeto_gobernado('contrato', p_autor_id, v_objeto_logico_id, p_motivo_nueva_version);
  v_objeto_gobernado := aprobar_objeto_gobernado(v_objeto_gobernado.id, p_autor_id);
  v_objeto_gobernado := publicar_objeto_gobernado(v_objeto_gobernado.id, p_vigente_desde);

  insert into contrato (
    persona_id, empresa_id, tipo_contrato, modalidad, jornada_pactada, periodicidad_pago,
    salario_pactado, moneda, condiciones_contractuales, fecha_inicio, fecha_fin, objeto_gobernado_id
  ) values (
    p_persona_id, p_empresa_id, p_tipo_contrato, p_modalidad, p_jornada_pactada, p_periodicidad_pago,
    p_salario_pactado, p_moneda, p_condiciones_contractuales, p_fecha_inicio, p_fecha_fin, v_objeto_gobernado.id
  )
  returning * into v_nueva;

  -- Defensa en profundidad: ver nota equivalente en registrar_banda_salarial.
  select count(*) into v_conteo_vigentes
  from contrato c
  join objeto_gobernado og on og.id = c.objeto_gobernado_id
  where c.persona_id = p_persona_id
    and og.estado = 'publicado'
    and og.vigente_hasta is null;

  if v_conteo_vigentes > 1 then
    raise exception 'integridad violada: % contratos vigentes simultáneos para persona_id = % (se esperaba máximo 1)', v_conteo_vigentes, p_persona_id;
  end if;

  return v_nueva;
end;
$$;

comment on function registrar_contrato is 'CORE 4 — única vía soportada para crear o revisar un contrato. Serializa por persona_id (advisory lock) y verifica que quede como máximo un contrato vigente por persona.';
