#!/usr/bin/env bash
# ============================================================================
# Suite de pruebas automatizadas de IBAC OS.
#
# Reemplaza las validaciones manuales que hasta ahora se repetían a mano
# en cada sesión: levanta una BD de pruebas desechable, corre las 14
# migraciones en orden, carga los helpers de aserción, y ejecuta cada
# archivo numerado de supabase/tests/ seguido de la prueba de concurrencia
# real sobre el fix de integridad de 0013.
#
# Uso:  bash supabase/tests/run.sh
#
# Sale con código 0 si todo pasa, 1 si algo falla. Pensado para correrse
# cada vez que se toque una migración o una función de la BD, no solo
# cuando algo "se ve raro".
# ============================================================================
set -u

DB_NAME="ibac_os_test_suite"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
TMP_DIR="$(mktemp -d)"
FALLOS=0

run_psql() {
  su postgres -c "psql -d $DB_NAME -v ON_ERROR_STOP=1 -q -f $1"
}

echo "=== Preparando base de datos de pruebas ($DB_NAME) ==="
pg_isready >/dev/null 2>&1 || service postgresql start >/dev/null 2>&1
su postgres -c "dropdb --if-exists $DB_NAME" >/dev/null 2>&1
su postgres -c "createdb $DB_NAME"

echo "=== Aplicando migraciones ==="
for f in "$MIGRATIONS_DIR"/*.sql; do
  if ! run_psql "$f" 2>&1; then
    echo ">>> FALLÓ aplicando migración: $f"
    su postgres -c "dropdb --if-exists $DB_NAME" >/dev/null 2>&1
    exit 1
  fi
done
echo "Migraciones OK."

echo "=== Cargando helpers de aserción ==="
run_psql "$SCRIPT_DIR/_helpers.sql" || { echo ">>> FALLÓ cargando _helpers.sql"; exit 1; }

echo "=== Corriendo archivos de prueba ==="
for f in "$SCRIPT_DIR"/[0-9]*.sql; do
  nombre="$(basename "$f")"
  echo "--- $nombre ---"
  if run_psql "$f" 2>&1 | tee "$TMP_DIR/$nombre.log"; then
    if grep -q "TEST FAILED" "$TMP_DIR/$nombre.log"; then
      echo ">>> FALLÓ: $nombre (ver TEST FAILED arriba)"
      FALLOS=$((FALLOS + 1))
    fi
  else
    echo ">>> FALLÓ (error no controlado): $nombre"
    FALLOS=$((FALLOS + 1))
  fi
done

echo "=== Prueba de concurrencia: registrar_contrato con dos sesiones en paralelo ==="
# Reproduce el hallazgo que llevó al fix de 0013: dos llamadas simultáneas
# para la MISMA persona nueva. Con el advisory lock, deben serializarse:
# una tiene éxito, la otra debe fallar pidiendo motivo_nueva_version (señal
# de que detectó el lineage ya creado por la primera), nunca ambas con éxito.
PERSONA_CONC="$(su postgres -c "psql -d $DB_NAME -t -A -c \"select gen_random_uuid()\"")"
EMPRESA_CONC="$(su postgres -c "psql -d $DB_NAME -t -A -c \"select id from empresa limit 1\"")"
su postgres -c "psql -d $DB_NAME -v ON_ERROR_STOP=1 -q -c \"insert into persona (id, empresa_id, nombres, apellido_paterno, estatus) values ('$PERSONA_CONC', '$EMPRESA_CONC', 'Carlos', 'Ruiz', 'activo')\""

concurrente() {
  su postgres -c "psql -d $DB_NAME -v ON_ERROR_STOP=1" <<EOF
begin;
select pg_sleep(1);
select registrar_contrato('$PERSONA_CONC'::uuid, '$EMPRESA_CONC'::uuid, 'indeterminado', 'presencial', 'diurna', 'quincenal', $1, '$PERSONA_CONC'::uuid);
commit;
EOF
}

concurrente 12000 > "$TMP_DIR/conc_a.log" 2>&1 &
PID_A=$!
concurrente 13000 > "$TMP_DIR/conc_b.log" 2>&1 &
PID_B=$!
wait $PID_A; EXIT_A=$?
wait $PID_B; EXIT_B=$?

EXITOS=0
[ "$EXIT_A" -eq 0 ] && EXITOS=$((EXITOS + 1))
[ "$EXIT_B" -eq 0 ] && EXITOS=$((EXITOS + 1))

CONTRATOS_VIGENTES="$(su postgres -c "psql -d $DB_NAME -t -A -c \"select count(*) from contrato c join objeto_gobernado og on og.id = c.objeto_gobernado_id where c.persona_id = '$PERSONA_CONC' and og.estado = 'publicado' and og.vigente_hasta is null\"")"

if [ "$EXITOS" -eq 1 ] && [ "$CONTRATOS_VIGENTES" -eq 1 ]; then
  echo "PASS: concurrencia serializada correctamente (1 éxito, 1 rechazo, 1 contrato vigente final)"
else
  echo ">>> FALLÓ: prueba de concurrencia (éxitos=$EXITOS, contratos_vigentes=$CONTRATOS_VIGENTES; se esperaba éxitos=1, contratos_vigentes=1)"
  echo "--- log A ---"; cat "$TMP_DIR/conc_a.log"
  echo "--- log B ---"; cat "$TMP_DIR/conc_b.log"
  FALLOS=$((FALLOS + 1))
fi

echo "=== Limpieza ==="
su postgres -c "dropdb --if-exists $DB_NAME"
rm -rf "$TMP_DIR"

echo "============================================================"
if [ "$FALLOS" -eq 0 ]; then
  echo "TODAS LAS PRUEBAS PASARON"
  exit 0
else
  echo "$FALLOS archivo(s)/prueba(s) con fallos"
  exit 1
fi
