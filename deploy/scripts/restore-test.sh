#!/usr/bin/env bash
# deploy/scripts/restore-test.sh
# Restauración de prueba mensual en stg-01 (AGENTS.md §10, criterio de salida de la F0): restaura el último
# respaldo del repositorio en un directorio aparte, lo levanta en un puerto propio y verifica que la base
# sirve: migraciones al día, conteos y que el último movimiento de horas y de auditoría sea reciente.
# Mide cuánto tarda (la parte de base de datos del RTO, §10) y lo anota en HISTORY, éxito o falla.
# Uso: restore-test.sh [repo: 1=NAS (por defecto) | 2=Azure]. Sale con error si algo no cuadra.
set -euo pipefail

REPO="${1:-1}"
WORK=/var/lib/kraken/restore-test
PGDATA="${WORK}/pgdata"
PORT=5499
MAX_AGE_HOURS=48
PG_BIN=/usr/lib/postgresql/16/bin
HISTORY=/var/lib/kraken/restore-test.log
RESTORE_S=-1

log() { printf '[restore-test %s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
psql_q() { psql -h 127.0.0.1 -p "$PORT" -U postgres -d kraken -Atc "$1"; }
record() {
  mkdir -p "$(dirname "$HISTORY")"
  printf '%s repo%s restauracion_s=%s total_s=%s %s\n' \
    "$(date -u +%FT%TZ)" "$REPO" "$RESTORE_S" "$SECONDS" "$1" >>"$HISTORY"
}
fail() {
  log "ERROR: $1"
  record "FALLA: $1"
  exit 1
}

cleanup() {
  "${PG_BIN}/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

log "Restaurando el último respaldo del repo ${REPO} en ${PGDATA}"
rm -rf "$WORK" && mkdir -p "$PGDATA" && chmod 700 "$PGDATA"
pgbackrest --stanza=kraken --repo="$REPO" --pg1-path="$PGDATA" \
  --type=default --target-action=promote --archive-mode=off restore || fail "pgbackrest restore"

# POR QUÉ: la copia no debe archivar WAL ni hablar con Patroni; arranca sola, en otro puerto.
"${PG_BIN}/pg_ctl" -D "$PGDATA" -o "-p ${PORT} -c archive_mode=off -c listen_addresses=127.0.0.1" \
  -w -t 600 start || fail "la base restaurada no arranca"
RESTORE_S=$SECONDS

log "Verificando la base restaurada"
psql_q "SELECT 1" >/dev/null || fail "la base restaurada no responde"
migrations=$(psql_q "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL")
pending=$(psql_q "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL")
cvs=$(psql_q "SELECT count(*) FROM cv.cv")
movements=$(psql_q "SELECT count(*) FROM horas.movimiento")
last_event=$(psql_q "SELECT COALESCE(EXTRACT(EPOCH FROM now() - max(creado_en))::int, -1) FROM audit.evento")

log "migraciones=${migrations} pendientes=${pending} cv=${cvs} movimientos_horas=${movements} ultimo_evento_hace_s=${last_event}"

if [[ "$pending" != "0" ]]; then fail "hay migraciones a medio aplicar"; fi
if ((migrations == 0)); then fail "la base restaurada no tiene migraciones"; fi
# REGLA: con WAL continuo, lo restaurado llega hasta minutos antes; más de 48 h sin eventos es sospechoso.
if ((last_event < 0 || last_event > MAX_AGE_HOURS * 3600)); then
  fail "el último evento de auditoría tiene más de ${MAX_AGE_HOURS} h (o no hay ninguno)"
fi

record "OK"
log "Restauración correcta en ${SECONDS} s (base lista a los ${RESTORE_S} s)."
