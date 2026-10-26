#!/usr/bin/env bash
# deploy/scripts/escrow-secrets.sh
# Custodia en el Key Vault de backup.bicep los secretos sin los que no hay recuperación (AGENTS.md §10): la
# configuración de pgBackRest (claves de cifrado y SAS) y los env de la app. Se corre tras cada cambio.
#   escrow-secrets.sh <vault> pgbackrest-conf=/etc/pgbackrest/pgbackrest.conf app-env=/etc/kraken/app.env …
# Nombres esperados por dr-restore.sh: pgbackrest-conf, app-env, migrate-env, tls-pem.
# Requiere `az login` de una cuenta del grupo de recuperación (rol Key Vault Secrets Officer).
set -euo pipefail

if (($# < 2)); then
  echo "uso: $0 <vault> <nombre>=<archivo> [<nombre>=<archivo> …]" >&2
  exit 2
fi
VAULT="$1"
shift

for pair in "$@"; do
  name="${pair%%=*}"
  file="${pair#*=}"
  if [[ ! -r "$file" ]]; then
    echo "ERROR: no se puede leer ${file}" >&2
    exit 1
  fi
  # POR QUÉ: la huella permite comprobar más tarde que lo custodiado es lo que corre, sin leer el secreto.
  sha="$(sha256sum "$file" | cut -c1-16)"
  az keyvault secret set --vault-name "$VAULT" --name "$name" --file "$file" \
    --content-type "text/plain" --tags "origen=$(hostname)" "sha256=${sha}" --output none
  echo "custodiado ${name} (${file}, sha256 ${sha}…)"
done
