-- ============================================================================
-- HARDENING — RPCs de escritura y vistas derivadas: solo service_role
-- ============================================================================
-- Hallazgo real (Supabase Advisors) sobre el primer proyecto real creado
-- para este repo (ibac-os-dev): por defecto Postgres otorga EXECUTE a
-- PUBLIC, así que los roles anon/authenticated podían invocar directamente
-- las 8 RPCs de escritura (registrar_contrato, subir_documento, publicar_
-- objeto_gobernado, etc.) vía PostgREST, saltándose por completo el
-- backend de Next.js (que siempre usa service_role). Esto ya estaba
-- señalado como decisión pendiente en el diseño ("escritura reservada a
-- service_role hasta definir matriz de permisos por rol"), pero nunca se
-- había aplicado el REVOKE explícito porque hasta ahora no existía un
-- proyecto real contra el cual verificarlo con el linter de Supabase.
--
-- Las 4 vistas derivadas (historial_salarial, kpi_puesto_resultado_reciente,
-- documento_asociacion_vigente, documento_permiso_vigente) se crean con
-- SECURITY DEFINER implícito (corren con los privilegios de quien las
-- creó, no de quien consulta), lo que bypassa el RLS del rol que consulta.
-- Se corrige con security_invoker=true (Postgres 15+): la vista vuelve a
-- respetar el RLS del rol que consulta, igual que cualquier tabla. No
-- cambia el acceso real porque el RLS de las tablas base ya es "lectura
-- autenticada = true" en todos lados, pero cierra el bypass de forma
-- explícita en vez de dejarlo implícito.
--
-- Guardia por rol: el harness de pruebas local (Postgres plano) tiene los
-- roles `authenticated` y `service_role` (ya usados por `create policy`
-- desde 0001), pero NO tiene `anon` — ese rol solo existe en una
-- plataforma Supabase real. Revocar de un rol inexistente falla con
-- "role anon does not exist", así que cada REVOKE se hace condicional a
-- que el rol exista, igual en espíritu a la guardia de esquema de 0015.
-- ============================================================================

do $$
declare
  v_firma text;
begin
  foreach v_firma in array array[
    'aprobar_objeto_gobernado(uuid, uuid)',
    'archivar_objeto_gobernado(uuid, date)',
    'crear_version_objeto_gobernado(text, uuid, uuid, text)',
    'publicar_objeto_gobernado(uuid, date)',
    'registrar_banda_salarial(uuid, numeric, numeric, uuid, numeric, text, text, date)',
    'registrar_contrato(uuid, uuid, contrato_tipo, contrato_modalidad, contrato_jornada, contrato_periodicidad_pago, numeric, uuid, text, text, date, date, text, date)',
    'subir_documento(uuid, text, text, uuid, text, text, text, bigint, jsonb)',
    'subir_nueva_version_documento(uuid, text, text, uuid, text, text, text, text, bigint, jsonb)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_firma);
    execute format('revoke execute on function %s from authenticated', v_firma);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', v_firma);
    end if;
    execute format('grant execute on function %s to service_role', v_firma);
  end loop;
end $$;

alter view historial_salarial set (security_invoker = true);
alter view kpi_puesto_resultado_reciente set (security_invoker = true);
alter view documento_asociacion_vigente set (security_invoker = true);
alter view documento_permiso_vigente set (security_invoker = true);
