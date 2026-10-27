#!/usr/bin/env bash
# deploy/scripts/deploy.sh
# Despliegue nodo por nodo sin cortar el servicio (AGENTS.md §10 CI/CD). Lo corre el runner de ops-01:
#   1. copia a /opt/kraken/ de cada nodo los archivos del entorno y escribe KRAKEN_TAG en /opt/kraken/.env;
#   2. migraciones compatibles hacia atrás, una vez, desde el primer nodo;
#   3. por cada nodo: drenarlo en los HAProxy de todos los nodos, actualizarlo, esperar /api/health/ready y
#      volver a habilitarlo.
# Uso: deploy.sh <entorno: staging|production> <tag de imagen (sha del commit)>
# Requiere: acceso SSH (usuario deploy) a los nodos listados en deploy/hosts/<entorno>, rsync en ops-01 y en los
# nodos, y /opt/kraken con dueño deploy.
set -euo pipefail

ENVIRONMENT="${1:?Uso: deploy.sh <staging|production> <tag>}"
TAG="${2:?Falta el tag de la imagen}"
DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOSTS_FILE="${DEPLOY_DIR}/hosts/${ENVIRONMENT}"
COMPOSE="docker compose -f /opt/kraken/compose.yml"
READY_TIMEOUT=180

# REGLA: solo estos archivos van a /opt/kraken/; /etc/kraken (secretos, certificado) y /opt/kraken/.env (NODE_IP,
# KRAKEN_REGISTRY) son del nodo y nunca se copian ni se sobrescriben.
case "$ENVIRONMENT" in
  staging) SYNC_FILES=(staging/compose.yml staging/haproxy.cfg staging/initdb) ;;
  production) SYNC_FILES=(app/compose.yml app/haproxy.cfg app/alloy.river) ;;
  *)
    echo "Entorno desconocido: ${ENVIRONMENT} (staging|production)" >&2
    exit 2
    ;;
esac
# POR QUÉ: el tag se escribe en un archivo y viaja en un comando remoto; solo se acepta un sha.
if [[ ! "$TAG" =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "El tag debe ser el sha del commit: ${TAG}" >&2
  exit 2
fi
mapfile -t NODES < <(grep -Ev '^\s*(#|$)' "$HOSTS_FILE")

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

# TRAMPA: sin --delete, para no borrar .env ni nada propio del nodo. -p conserva el permiso de ejecución de initdb/ y
# --chmod deja todo legible para los contenedores. LIMITACIÓN: rsync reemplaza haproxy.cfg por un archivo nuevo y el
# contenedor sigue con el anterior hasta `docker compose restart haproxy` (ver deploy/README.md).
sync_files() {
  local node="$1" file sources=()
  for file in "${SYNC_FILES[@]}"; do sources+=("${DEPLOY_DIR}/${file}"); done
  rsync -rlpt --chmod=go-w,a+rX "${sources[@]}" "deploy@${node}:/opt/kraken/"
}

# Actualiza o agrega KRAKEN_TAG sin tocar las demás líneas de /opt/kraken/.env.
write_tag() {
  ssh "deploy@$1" bash -s -- "$TAG" <<'REMOTE'
set -euo pipefail
env_file=/opt/kraken/.env
touch "$env_file"
if grep -q '^KRAKEN_TAG=' "$env_file"; then
  sed -i "s/^KRAKEN_TAG=.*/KRAKEN_TAG=$1/" "$env_file"
else
  # POR QUÉ: sin salto de línea final, la línea nueva quedaría pegada a la última.
  if [ -s "$env_file" ] && [ -n "$(tail -c1 "$env_file")" ]; then echo >>"$env_file"; fi
  echo "KRAKEN_TAG=$1" >>"$env_file"
fi
REMOTE
}

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
# POR QUÉ: la migración corre con el compose y el tag de este commit; los dos viajan juntos a cada nodo antes.
for node in "${NODES[@]}"; do
  sync_files "${node}"
  write_tag "${node}"
done
log "Archivos copiados y KRAKEN_TAG=${TAG} en /opt/kraken/.env de cada nodo."

ssh "deploy@${NODES[0]}" "${COMPOSE} pull --quiet && ${COMPOSE} --profile migrate run --rm migrate"
log "Migraciones aplicadas."

for node in "${NODES[@]}"; do
  # POR QUÉ: con un solo nodo (staging) no hay a quién pasarle el tráfico; se actualiza en el lugar.
  if ((${#NODES[@]} > 1)); then
    haproxy_all "set server app/${node} state drain"
    log "${node} drenado; espera a que terminen las peticiones en curso."
    sleep 15
  fi
  ssh "deploy@${node}" "${COMPOSE} pull --quiet && ${COMPOSE} up -d --remove-orphans"
  wait_ready "${node}"
  if ((${#NODES[@]} > 1)); then haproxy_all "set server app/${node} state ready"; fi
  log "${node} actualizado y en servicio."
done

log "Despliegue completo."
