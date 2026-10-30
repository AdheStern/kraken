#!/usr/bin/env bash
# deploy/scripts/deploy.sh
# Despliegue nodo por nodo sin cortar el servicio (AGENTS.md §10 CI/CD). Lo corre el runner de ops-01:
#   1. HAProxy: copia haproxy/ a cada nodo (con un .bak del anterior); si cambió, lo valida en todos y después lo
#      recarga con HUP nodo por nodo. Si algo falla, restaura el anterior en todos y aborta sin tocar nada más;
#   2. copia el resto de los archivos del entorno y escribe KRAKEN_TAG en /opt/kraken/.env;
#   3. migraciones compatibles hacia atrás, una vez, desde el primer nodo; en producción, antes, levanta su HAProxy
#      si no corre (la migración llega a la base por él) y espera a que pg_primary esté UP;
#   4. por cada nodo: drenarlo en los HAProxy de todos los nodos, actualizarlo, esperar /api/health/ready y
#      volver a habilitarlo.
# keepalived no se toca: su configuración es manual (deploy/README.md).
# Uso: deploy.sh <entorno: staging|production> <tag de imagen (sha del commit)>
# Requiere: acceso SSH (usuario deploy) a los nodos listados en deploy/hosts/<entorno>, rsync en ops-01 y en los
# nodos, curl en los nodos y /opt/kraken con dueño deploy.
set -euo pipefail

ENVIRONMENT="${1:?Uso: deploy.sh <staging|production> <tag>}"
TAG="${2:?Falta el tag de la imagen}"
DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOSTS_FILE="${DEPLOY_DIR}/hosts/${ENVIRONMENT}"
COMPOSE="docker compose -f /opt/kraken/compose.yml"
READY_TIMEOUT=180
HAPROXY_DB_TIMEOUT=60
HAPROXY_CFG=/opt/kraken/haproxy/haproxy.cfg
HAPROXY_BAK=/opt/kraken/haproxy.cfg.bak

# REGLA: solo estos archivos van a /opt/kraken/; /etc/kraken (secretos, certificado) y /opt/kraken/.env (NODE_IP,
# KRAKEN_REGISTRY) son del nodo y nunca se copian ni se sobrescriben.
case "$ENVIRONMENT" in
  staging)
    SOURCE=staging OTHER_FILES=(compose.yml initdb) PUBLIC_HOST=stg-kraken.dima.com.bo
    HAPROXY_ENV_OPT="" ADMIN_SOCKET=0
    ;;
  production)
    SOURCE=app OTHER_FILES=(compose.yml alloy.river) PUBLIC_HOST=kraken.dima.com.bo
    # POR QUÉ: el haproxy.cfg de producción usa ${STATS_BIND_IP}; sin su env la validación fallaría.
    HAPROXY_ENV_OPT="--env-file /etc/kraken/haproxy.env" ADMIN_SOCKET=1
    ;;
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
# REGLA: se valida con la misma imagen que el servicio haproxy del compose que se despliega.
HAPROXY_IMAGE="$(awk '/^  haproxy:/{s=1;next} s&&/^    image:/{print $2;exit}' "${DEPLOY_DIR}/${SOURCE}/compose.yml")"
NEW_SHA="$(sha256sum "${DEPLOY_DIR}/${SOURCE}/haproxy/haproxy.cfg" | cut -d' ' -f1)"
CHANGED=() RELOADED=()
declare -A IS_NEW=()

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
fail() {
  log "ERROR: $*"
  exit 1
}
[[ -n "$HAPROXY_IMAGE" ]] || fail "no se encontró la imagen del servicio haproxy en ${SOURCE}/compose.yml."

# TRAMPA: sin --delete, para no borrar .env ni nada propio del nodo. -p conserva el permiso de ejecución de initdb/ y
# --chmod deja todo legible para los contenedores.
rsync_to() {
  local node="$1"
  shift
  rsync -rlpt --chmod=go-w,a+rX "$@" "deploy@${node}:/opt/kraken/"
}

# Guarda el haproxy.cfg vigente en .bak y copia el nuevo solo si su sha256 cambió.
stage_haproxy() {
  local node="$1" old
  old="$(ssh "deploy@${node}" "if [ -f ${HAPROXY_CFG} ]; then cp -p ${HAPROXY_CFG} ${HAPROXY_BAK} &&
    sha256sum ${HAPROXY_CFG} | cut -d' ' -f1; else rm -f ${HAPROXY_BAK}; echo ninguno; fi")"
  [[ "$old" != "$NEW_SHA" ]] || return 0
  [[ "$old" != ninguno ]] || IS_NEW[$node]=1
  rsync_to "$node" "${DEPLOY_DIR}/${SOURCE}/haproxy"
  CHANGED+=("$node")
  log "${node}: haproxy.cfg cambia (${old:0:12} → ${NEW_SHA:0:12})."
}

validate_haproxy() {
  ssh "deploy@$1" "docker run --rm --user root ${HAPROXY_ENV_OPT} -v ${HAPROXY_CFG}:/usr/local/etc/haproxy/haproxy.cfg:ro \
    -v /etc/kraken/tls/kraken.pem:/etc/kraken/tls/kraken.pem:ro ${HAPROXY_IMAGE} haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg"
}

# Vuelve al haproxy.cfg anterior en todos los nodos donde se copió uno nuevo (o lo quita si no había).
restore_haproxy_all() {
  local node
  for node in "${CHANGED[@]}"; do
    ssh "deploy@${node}" "if [ -f ${HAPROXY_BAK} ]; then cp -p ${HAPROXY_BAK} ${HAPROXY_CFG}; else rm -f ${HAPROXY_CFG}; fi" ||
      log "ERROR: no se pudo restaurar haproxy.cfg en ${node}; revisarlo a mano."
  done
  log "haproxy.cfg anterior restaurado en ${CHANGED[*]}."
}

# Recarga con HUP (modo master-worker: los workers viejos terminan sus conexiones abiertas) y verifica que el
# master cargó la configuración, que el contenedor sigue arriba y que el frontend (y el socket, si hay) responden.
reload_haproxy() {
  ssh "deploy@$1" bash -s -- "$PUBLIC_HOST" "$ADMIN_SOCKET" <<'REMOTE'
set -euo pipefail
compose="docker compose -f /opt/kraken/compose.yml"
id="$($compose ps -q haproxy)"
[ -n "$id" ] || { echo "haproxy no está corriendo: la configuración se aplica al levantarlo."; exit 0; }
since="$(date -u +%s)"
$compose kill -s HUP haproxy >/dev/null
for _ in $(seq 10); do
  logs="$(docker logs --since "$since" "$id" 2>&1)"
  if grep -q 'Loading failure' <<<"$logs"; then echo "HAProxy rechazó la configuración nueva."; exit 1; fi
  if grep -q 'Loading success' <<<"$logs"; then break; fi
  sleep 1
done
grep -q 'Loading success' <<<"$logs" || { echo "HAProxy no confirmó la recarga en 10 s."; exit 1; }
[ "$(docker inspect -f '{{.State.Running}}' "$id")" = true ] || { echo "el contenedor haproxy se detuvo."; exit 1; }
# Cualquier respuesta HTTP sirve: un 503 del backend también prueba que el frontend recargado atiende.
code="$(curl -sk -o /dev/null -w '%{http_code}' -H "Host: $1" https://127.0.0.1/ || true)"
[ "$code" != 000 ] || { echo "el frontend :443 no responde."; exit 1; }
if [ "$2" = 1 ] && ! echo "show info" | sudo socat stdio /run/haproxy/admin.sock | grep -q '^Name: HAProxy'; then
  echo "el socket de administración no responde."
  exit 1
fi
REMOTE
}

# REGLA: valida en todos los nodos antes de recargar ninguno; si una recarga falla, todos vuelven al anterior.
apply_haproxy() {
  local node
  for node in "${CHANGED[@]}"; do
    if ! validate_haproxy "$node"; then
      restore_haproxy_all
      fail "el haproxy.cfg nuevo no es válido en ${node}. No se tocaron migraciones, imágenes ni contenedores."
    fi
  done
  log "haproxy.cfg nuevo válido en ${CHANGED[*]}."
  for node in "${CHANGED[@]}"; do
    if [[ -n "${IS_NEW[$node]:-}" ]]; then
      log "${node}: no había haproxy/haproxy.cfg; se aplica cuando se levante o recree haproxy."
      continue
    fi
    if ! reload_haproxy "$node"; then
      restore_haproxy_all
      for done_node in "${RELOADED[@]}" "$node"; do
        reload_haproxy "$done_node" || log "ERROR: ${done_node} no recargó el haproxy.cfg anterior; revisarlo a mano."
      done
      fail "la recarga de HAProxy falló en ${node}; todos los nodos volvieron al haproxy.cfg anterior."
    fi
    RELOADED+=("$node")
    log "${node}: HAProxy recargado sin cortar conexiones."
  done
}

sync_files() {
  local node="$1" file sources=()
  for file in "${OTHER_FILES[@]}"; do sources+=("${DEPLOY_DIR}/${SOURCE}/${file}"); done
  rsync_to "$node" "${sources[@]}"
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

# POR QUÉ: en producción la migración llega a la base por el HAProxy del propio nodo (host.docker.internal:5000); en
# el primer despliegue de un nodo todavía no existe y Prisma fallaría con P1001. Si ya corre, no se toca: la recarga
# por cambios en haproxy.cfg es de apply_haproxy.
ensure_db_proxy() {
  ssh "deploy@$1" bash -s -- "$HAPROXY_DB_TIMEOUT" <<'REMOTE'
set -euo pipefail
compose="docker compose -f /opt/kraken/compose.yml"
[ -z "$($compose ps -q haproxy)" ] || exit 0
echo "haproxy no está corriendo: se levanta para que la migración llegue a la base."
$compose up -d haproxy
status=""
for _ in $(seq "$1"); do
  # TRAMPA: show stat es CSV; la fila BACKEND de pg_primary queda UP cuando un servidor responde /primary en :8008.
  status="$(echo "show stat" | sudo socat stdio /run/haproxy/admin.sock 2>/dev/null |
    awk -F, '$1 == "pg_primary" && $2 == "BACKEND" {print $18}' || true)"
  [ "$status" != UP ] || exit 0
  sleep 1
done
echo "el backend pg_primary de HAProxy no quedó UP en $1 s (último estado: ${status:-sin respuesta del socket})."
echo "Revisar que Patroni responda /primary en :8008 desde este nodo y el log de haproxy."
exit 1
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

# TRAMPA: si cambia el servicio haproxy de compose.yml (imagen, montajes), `up -d` lo recrea y ese nodo deja de
# atender unos segundos: con varios nodos la IP virtual pasa al otro (track_script de keepalived); con uno, se corta.
update_node() {
  local node="$1" before after
  before="$(ssh "deploy@${node}" "${COMPOSE} ps -q haproxy")"
  ssh "deploy@${node}" "${COMPOSE} pull --quiet && ${COMPOSE} up -d --remove-orphans"
  after="$(ssh "deploy@${node}" "${COMPOSE} ps -q haproxy")"
  [[ -n "$before" && "$before" != "$after" ]] || return 0
  if ((${#NODES[@]} > 1)); then
    log "${node}: haproxy recreado (cambió su servicio en compose.yml); este nodo dejó de atender unos segundos."
  else
    log "${node}: haproxy recreado (cambió su servicio en compose.yml); con un solo nodo, el servicio se cortó unos segundos."
  fi
}

log "Entorno ${ENVIRONMENT}, imagen ${TAG}, nodos: ${NODES[*]}"
for node in "${NODES[@]}"; do stage_haproxy "${node}"; done
if ((${#CHANGED[@]} > 0)); then apply_haproxy; else log "haproxy.cfg sin cambios: HAProxy no se toca."; fi

# POR QUÉ: la migración corre con el compose y el tag de este commit; los dos viajan juntos a cada nodo antes.
for node in "${NODES[@]}"; do
  sync_files "${node}"
  write_tag "${node}"
done
log "Archivos copiados y KRAKEN_TAG=${TAG} en /opt/kraken/.env de cada nodo."

if [[ "$ENVIRONMENT" == production ]]; then
  ensure_db_proxy "${NODES[0]}" || fail "${NODES[0]}: sin HAProxy hacia la base no se migra; no se tocaron imágenes ni contenedores de la app."
  log "${NODES[0]}: HAProxy con pg_primary UP."
fi
ssh "deploy@${NODES[0]}" "${COMPOSE} pull --quiet && ${COMPOSE} --profile migrate run --rm migrate"
log "Migraciones aplicadas."

for node in "${NODES[@]}"; do
  # POR QUÉ: con un solo nodo (staging) no hay a quién pasarle el tráfico; se actualiza en el lugar.
  if ((${#NODES[@]} > 1)); then
    haproxy_all "set server app/${node} state drain"
    log "${node} drenado; espera a que terminen las peticiones en curso."
    sleep 15
  fi
  update_node "${node}"
  wait_ready "${node}"
  if ((${#NODES[@]} > 1)); then haproxy_all "set server app/${node} state ready"; fi
  log "${node} actualizado y en servicio."
done

log "Despliegue completo."
