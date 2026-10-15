#!/usr/bin/env bash
# deploy/scripts/deploy.sh
# Despliegue nodo por nodo sin cortar el servicio (AGENTS.md §10 CI/CD). Lo corre el runner de ops-01:
#   1. migraciones compatibles hacia atrás, una vez, desde el primer nodo;
#   2. por cada nodo: drenarlo en los HAProxy de todos los nodos, actualizarlo, esperar /api/health/ready y
#      volver a habilitarlo.
# Uso: deploy.sh <entorno: staging|production> <tag de imagen (sha del commit)>
# Requiere: acceso SSH (usuario deploy) a los nodos listados en deploy/hosts/<entorno>.
set -euo pipefail

ENVIRONMENT="${1:?Uso: deploy.sh <staging|production> <tag>}"
TAG="${2:?Falta el tag de la imagen}"
HOSTS_FILE="$(dirname "$0")/../hosts/${ENVIRONMENT}"
mapfile -t NODES < <(grep -Ev '^\s*(#|$)' "$HOSTS_FILE")
COMPOSE="docker compose -f /opt/kraken/compose.yml"
READY_TIMEOUT=180

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

haproxy_all() {
  local command="$1"
  for lb in "${NODES[@]}"; do
    ssh "deploy@${lb}" "echo '${command}' | sudo socat stdio /run/haproxy/admin.sock" >/dev/null
  done
}

wait_ready() {
  local node="$1" waited=0
  until ssh "deploy@${node}" "curl -fsS -o /dev/null http://\$(hostname -I | awk '{print \$1}'):3000/api/health/ready"; do
    waited=$((waited + 5))
    if ((waited >= READY_TIMEOUT)); then
      log "ERROR: ${node} no quedó listo en ${READY_TIMEOUT}s; se deja drenado para revisarlo."
      return 1
    fi
    sleep 5
  done
}

log "Entorno ${ENVIRONMENT}, imagen ${TAG}, nodos: ${NODES[*]}"
ssh "deploy@${NODES[0]}" "KRAKEN_TAG=${TAG} ${COMPOSE} pull --quiet && KRAKEN_TAG=${TAG} ${COMPOSE} --profile migrate run --rm migrate"
log "Migraciones aplicadas."

for node in "${NODES[@]}"; do
  # POR QUÉ: con un solo nodo (staging) no hay a quién pasarle el tráfico; se actualiza en el lugar.
  if ((${#NODES[@]} > 1)); then
    haproxy_all "set server app/${node} state drain"
    log "${node} drenado; espera a que terminen las peticiones en curso."
    sleep 15
  fi
  ssh "deploy@${node}" "KRAKEN_TAG=${TAG} ${COMPOSE} pull --quiet && KRAKEN_TAG=${TAG} ${COMPOSE} up -d --remove-orphans"
  wait_ready "${node}"
  if ((${#NODES[@]} > 1)); then haproxy_all "set server app/${node} state ready"; fi
  log "${node} actualizado y en servicio."
done

log "Despliegue completo."
