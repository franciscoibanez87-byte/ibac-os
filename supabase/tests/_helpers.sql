-- ============================================================================
-- Helpers de la suite de pruebas. Se cargan en la BD de pruebas desechable
-- antes de correr los archivos numerados; NUNCA se instalan en una BD real
-- (run.sh los carga aparte de las migraciones de supabase/migrations/).
-- ============================================================================

-- Afirma que una condición es verdadera. Uso:
--   select test_assert(count(*) = 1, 'debe haber exactamente 1 fila vigente');
create or replace function test_assert(condicion boolean, mensaje text) returns void
language plpgsql as $$
begin
  if not condicion then
    raise exception 'TEST FAILED: %', mensaje;
  end if;
  raise notice 'PASS: %', mensaje;
end;
$$;

-- Afirma que ejecutar `sentencia` (SQL dinámico) LANZA un error. Si tiene
-- éxito en vez de fallar, el test mismo falla (evita falsos positivos por
-- un helper que "siempre pasa"). Imprime el mensaje de error real para que
-- quede visible en el log cuál fue la causa del rechazo.
create or replace function test_assert_raises(sentencia text, mensaje text) returns void
language plpgsql as $$
begin
  begin
    execute sentencia;
  exception when others then
    raise notice 'PASS: % (rechazado correctamente: %)', mensaje, sqlerrm;
    return;
  end;
  raise exception 'TEST FAILED: % (se esperaba que fallara, pero tuvo éxito)', mensaje;
end;
$$;
