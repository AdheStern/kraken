#!/usr/bin/env bash
# deploy/scripts/dr-restore.sh
# Recuperación en Azure (AGENTS.md §10 DR), en la VM de dr.bicep y como root: trae los secretos del Key Vault,
# restaura el repo2 hasta el último WAL, levanta Postgres y la app de un nodo y deja un informe con la duración de
# cada paso y el RTO. El corte de DNS es manual (deploy/README.md) y se suma al informe a mano.
# Uso: dr-restore.sh <ensayo|desastre> <key-vault> <kraken-tag> [<inicio del incidente, ISO 8601 UTC>]
# TRAMPA: un ensayo no archiva WAL ni respalda (una línea de tiempo nueva en la stanza de producción la
# seguirían las restauraciones siguientes) ni arranca el worker (enviaría correos y correría jobs reales).
set -euo pipefail

MODE="$1"
VAULT="$2"
TAG="$3"
INCIDENT="${4:-}"
[[ "$MODE" == ensayo || "$MODE" == desastre ]] || { echo "modo: ensayo | desastre" >&2; exit 2; }
DEPLOY="$(cd "$(dirname "$0")/.." && pwd)"
CONF=/etc/kraken/dr
PGDATA=/var/lib/kraken/pgdata
REPORT="/var/log/kraken-dr/informe-$(date -u +%Y%m%dT%H%MZ).txt"
STEP_START=$SECONDS

report() { printf '%s\n' "$*" | tee -a "$REPORT"; }
step() {
  report "$(printf '%-34s %6ss' "$1" "$((SECONDS - STEP_START))")"
  STEP_START=$SECONDS
}
secret() { az keyvault secret show --vault-name "$VAULT" --name "$1" --query value -o tsv; }
as_pg() { runuser -u postgres -- "$@"; }

[[ -f /var/lib/cloud/kraken-dr-ready ]] || { echo "cloud-init no terminó" >&2; exit 1; }
report "Kraken DR (${MODE}) · $(date -u +%FT%TZ) · vault ${VAULT} · imagen ${TAG}"

az login --identity --output none
install -d -m 750 -o root -g postgres "$CONF"
# REGLA: solo el repo2; el NAS (repo1) se da por perdido. Misma stanza: lo nuevo sigue en otra línea de tiempo.
{
  secret pgbackrest-conf | grep -E '^(repo2-|process-max|compress-type)'
  printf 'archive-async=y\nspool-path=/var/spool/pgbackrest\nlog-level-console=info\n'
  printf '\n[kraken]\npg1-path=%s\n' "$PGDATA"
} >"$CONF/pgbackrest.conf"
secret app-env >/etc/kraken/app.env
secret migrate-env >/etc/kraken/migrate.env
secret tls-pem >/etc/kraken/tls.pem
chmod 600 /etc/kraken/*.env /etc/kraken/tls.pem
chmod 640 "$CONF/pgbackrest.conf" && chown root:postgres "$CONF/pgbackrest.conf"
install -m 644 "$DEPLOY/dr/postgresql.conf" "$DEPLOY/dr/pg_hba.conf" "$CONF/"
if [[ "$MODE" == ensayo ]]; then echo "archive_mode = off" >"$CONF/modo.conf"; else : >"$CONF/modo.conf"; fi
step "Secretos del Key Vault"

rm -rf "$PGDATA" && install -d -m 700 -o postgres -g postgres "$PGDATA"
as_pg pgbackrest --config="$CONF/pgbackrest.conf" --stanza=kraken --repo=2 \
  --type=default --target-action=promote restore
step "Restauración del repo2"

install -m 644 "$DEPLOY/dr/kraken-dr-postgres.service" /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now kraken-dr-postgres
until [[ "$(as_pg psql -d kraken -Atc 'SELECT pg_is_in_recovery()' 2>/dev/null)" == "f" ]]; do sleep 5; done
data_until="$(as_pg psql -d kraken -Atc "SELECT max(creado_en) FROM audit.evento")"
step "WAL aplicado y base promovida"

if ghcr="$(secret ghcr-pull 2>/dev/null)"; then
  docker login ghcr.io -u "${ghcr%%:*}" --password-stdin <<<"${ghcr#*:}" >/dev/null
fi
compose() {
  NODE_IP=127.0.0.1 KRAKEN_TAG="$TAG" docker compose \
    -f "$DEPLOY/app/compose.yml" -f "$DEPLOY/dr/compose.dr.yml" "$@"
}
compose pull --quiet
if [[ "$MODE" == ensayo ]]; then compose up -d app haproxy; else compose up -d; fi
step "Imágenes y contenedores"

until curl -skf https://127.0.0.1/api/health/ready >/dev/null; do sleep 5; done
step "App lista (/api/health/ready)"

# POR QUÉ: el primer completo de la línea de tiempo nueva no cuenta para el RTO; corre en segundo plano.
if [[ "$MODE" == desastre ]]; then
  nohup runuser -u postgres -- pgbackrest --config="$CONF/pgbackrest.conf" --stanza=kraken --repo=2 \
    --type=full backup >/var/log/kraken-dr/primer-completo.log 2>&1 &
fi

report "Total en la VM: ${SECONDS} s · datos hasta el último evento de auditoría: ${data_until}"
if [[ -n "$INCIDENT" ]]; then
  report "RTO desde el incidente (${INCIDENT}), sin el DNS: $(($(date -u +%s) - $(date -u -d "$INCIDENT" +%s))) s"
fi
report "Falta: cortar el DNS hacia esta VM y anotar aquí cuándo responde el dominio (deploy/README.md)."
