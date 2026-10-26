# Despliegue y operación de Kraken

Runbook para DIMANET (VMs, red, NAS, respaldos) y DIMASOFT (aplicación, base de datos, CI/CD). Arquitectura y
decisiones: [AGENTS.md §3 y §10](../AGENTS.md). Objetivo no negociable: **ninguna pérdida de información**.

> **Estado:** las plantillas de este directorio están escritas, pero **solo se validó lo que dice
> «validado»** en la tabla del final. El resto se valida al aplicarlo en las VMs; anotar ahí cada ajuste.

## Mapa de archivos

| Dónde corre | Archivo | Qué es |
|---|---|---|
| Desarrollo | `compose.dev.yml` | Postgres 16 y Mailpit |
| app-01, app-02 | `app/compose.yml` | Next.js, worker, HAProxy y Alloy (logs) |
| app-01, app-02 | `app/haproxy.cfg` | Web → los dos Next (sale el que falle `/api/health/ready`); `:5000` → primario de Patroni |
| app-01, app-02 | `app/keepalived.conf` | IP virtual (en el sistema operativo, no en Docker) |
| app-01, app-02 | `app/*.env.example` | Plantillas de `/etc/kraken/app.env`, `migrate.env` (solo el servicio `migrate`: dueño del esquema) y `haproxy.env` |
| db-01..03 | `db/compose.yml`, `db/patroni.yml`, `db/Dockerfile.patroni` | etcd + PostgreSQL 16 + Patroni (réplica síncrona) + pgBackRest |
| db-01..03 | `backup/pgbackrest.db.conf` | Empuja el WAL a ops-01 por TLS |
| ops-01 | `backup/pgbackrest.repo.conf` | Repositorio: NAS (repo1) y Azure inmutable (repo2), cifrados |
| Azure (una vez) | `azure/backup.bicep` | Storage del repo2 con inmutabilidad por versión y Key Vault de recuperación, con bloqueos |
| Azure (desastre o ensayo) | `azure/dr.bicep`, `azure/dr-cloud-init.yaml` | VM de recuperación: red, IP pública, Postgres 16, pgBackRest, Docker, lectura del Key Vault |
| VM de recuperación | `scripts/dr-restore.sh`, `dr/*` | Restaura el repo2 y levanta Postgres y la app en un nodo; informe con el RTO |
| ops-01, app-0X | `scripts/escrow-secrets.sh` | Custodia en el Key Vault la configuración de pgBackRest y los env (sin ellos, el repo2 no sirve) |
| ops-01 | `backup/systemd/kraken-backup*` | Completo domingo 02:00, diferencial diario 02:00 (los adjuntos viven en SharePoint, ADR-16) |
| ops-01 | `ops/compose.yml`, `ops/prometheus.yml` | Prometheus, Loki, Grafana, Uptime Kuma |
| stg-01 | `scripts/restore-test.sh` + `backup/systemd/kraken-restore-test*` | Restauración de prueba mensual de los dos repos, con duración |
| stg-01 | `backup/pgbackrest.restore.conf` | pgBackRest de solo lectura (NAS montado y SAS `rl` de Azure) |
| ops-01 (runner) | `scripts/deploy.sh`, `hosts/*` | Despliegue nodo por nodo |
| Primera vez | `sql/roles.sql` | Roles `kraken_migra` (DDL), `kraken_app` (solo DML), `kraken_lectura` |
| Cada despliegue | `sql/pgboss-grants.sql`, `sql/lectura-grants.sql` | Los aplica `worker:migrate`: DML de pg-boss para la app; lectura sin el esquema `auth` |

## Valores que pone DIMANET

IPs de la VLAN de aplicación (app-01, app-02, IP virtual) y de datos (db-01..03, ops-01) · interfaz de red
para keepalived · ruta NFS del NAS para pgBackRest (`/mnt/nas/pgbackrest`) ·
suscripción y grupo de recursos de Azure para `azure/backup.bicep` y el grupo de Entra que custodia los secretos · nombre DNS y certificado público en el FortiGate/Radware · sitio de SharePoint
para los adjuntos con un registro de app `Sites.Selected` (escritura solo en ese sitio) y el id de su biblioteca.

## Puesta en marcha (orden)

1. **VMs y red.** Topología de AGENTS.md §10. Discos de base en datastores o LUN distintos si se puede. Solo
   app-01, app-02 y ops-01 llegan al 5432 de los nodos de base.
2. **Certificados de pgBackRest.** Una CA propia y un certificado por nodo (`db-01..03`, `ops-01`) en
   `/etc/kraken/tls` (bases) y `/etc/pgbackrest/tls` (ops-01). El CN de cada certificado es el nombre del nodo.
3. **Base de datos.** En cada db-0X: construir `kraken-patroni:16`, copiar `patroni.yml` (con su nombre e IP),
   `patroni.env`, `pgbackrest.conf` y levantar `db/compose.yml`. Verificar: `curl http://<db>:8008/cluster`
   muestra un líder y dos réplicas, una síncrona. `patroni.env` lleva también `PATRONI_RESTAPI_USERNAME` y
   `PATRONI_RESTAPI_PASSWORD`: sin ellas cualquiera en la red podría conmutar el primario.
4. **Roles.** En el primario, como `postgres`: `psql -f sql/roles.sql` (con las claves reemplazadas).
5. **Respaldos.** En Azure: `az deployment group create -g <grupo> -f azure/backup.bicep -p prefix=<…>
   drAdminsGroupId=<objectId> allowedIps='["<ip-salida-ops-01>","<ip-salida-stg-01>"]'`. Dos SAS de cuenta
   para el contenedor `pgbackrest`, solo HTTPS: `racwdl` para ops-01 y `rl` para stg-01 (**nunca** `x` ni `y`:
   borrar versiones anularía la inmutabilidad). En ops-01: pgBackRest con `pgbackrest.repo.conf`,
   `pgbackrest --stanza=kraken stanza-create` y `pgbackrest --stanza=kraken check`; instalar y habilitar los
   timers de `backup/systemd`. En stg-01: `pgbackrest.restore.conf` y el timer de la restauración de prueba.
   Tras el primer ensayo correcto, bloquear la política de inmutabilidad (ya no se podrá acortar).
6. **Custodia.** Con `az login` de alguien del grupo: en ops-01 `scripts/escrow-secrets.sh <vault>
   pgbackrest-conf=/etc/pgbackrest/pgbackrest.conf` y, hecho el paso 7, en app-01 `… app-env=/etc/kraken/app.env
   migrate-env=/etc/kraken/migrate.env tls-pem=<certificado y clave del dominio en PEM>`. Repetirlo tras cada
   cambio de esos archivos (rotación de secretos de Entra, SAS o claves).
7. **Nodos de aplicación.** En cada app-0X: `/opt/kraken` con `app/compose.yml`, `haproxy.cfg`, `alloy.river`
   y un `.env` con `NODE_IP`; `/etc/kraken/app.env`, `migrate.env` y `haproxy.env` (permisos 600, con
   `STATS_BIND_IP` = IP de operación del nodo); keepalived en el sistema. `MIGRATION_DATABASE_URL` va solo en
   `migrate.env`: la app y el worker nunca reciben la clave del dueño del esquema.
8. **Operación.** En ops-01: `ops/compose.yml`. En Uptime Kuma, monitores de `https://<dominio>/api/health/ready`
   y de cada nodo, con avisos por correo y Teams.
9. **CI/CD.** Runner autoalojado de GitHub en ops-01 con la etiqueta `ops-01`; usuario `deploy` con su clave
   SSH en los nodos (con permiso de `sudo socat` sobre el socket de HAProxy). En GitHub: entornos `staging` y
   `production` (este con aprobación obligatoria) y la variable `CI_RUNNER=ops-01` si CI debe correr ahí.
10. **Primer despliegue.** Desde GitHub, *Deploy → Run workflow*. El script migra (`pnpm migrate:deploy`:
   Prisma, esquema de pg-boss y catálogos base) y actualiza nodo por nodo.
11. **Cuenta de emergencia.** Una vez: `docker compose -f /opt/kraken/compose.yml --profile migrate run --rm
    -e SUPERADMIN_EMAIL=… -e SUPERADMIN_PASSWORD=… migrate pnpm db:seed:admin`.

## Operación diaria

- **Sacar un nodo a mano:** `echo "set server app/app-01 state drain" | sudo socat stdio /run/haproxy/admin.sock`
  en los dos nodos (`state ready` para volverlo).
- **Cambio de primario:** `patronictl -c /etc/patroni/patroni.yml switchover` dentro del contenedor `postgres`.
  HAProxy corta las conexiones al viejo primario y la app reconecta sola.
- **Restauración de prueba:** el primer domingo de cada mes en stg-01, del NAS y de Azure; a mano:
  `scripts/restore-test.sh 1` (NAS) o `2` (Azure). Duraciones y resultados en `/var/lib/kraken/restore-test.log`
  (la de Azure es la parte de base de datos del RTO). Si falla, revisar `journalctl -u kraken-restore-test`.
- **Logs:** en Grafana, origen Loki, `{servicio="app"} | json | requestId="…"` sigue una petición del borde a la
  base.

## Recuperación ante desastre en Azure (en frío)

Si cae el host o el NAS. Objetivo: **4 h** desde el incidente hasta que el dominio responde (AGENTS.md §10).
Se ensaya dos veces al año con el modo `ensayo`, y cada informe se guarda junto al acta del ensayo.

**Antes, en tiempos normales:** TTL de 300 s en el registro DNS del dominio; los secretos custodiados (paso 6),
también `ghcr-pull` (`usuario:token` de lectura de paquetes) si las imágenes de GHCR son privadas.

1. **Declarar el desastre** (GG con DIMANET) y anotar la hora: es el inicio del RTO. En un ensayo no se declara
   nada y producción sigue intacta.
2. **VM.** `az deployment group create -g <grupo> -f azure/dr.bicep -p prefix=<…> keyVaultName=<vault>
   adminCidr=<mi-ip>/32 sshPublicKey="$(cat ~/.ssh/id_ed25519.pub)"`. Si el storage tiene `allowedIps`, sumar
   la IP pública de la salida: `az storage account network-rule add -g <grupo> --account-name <…> --ip-address
   <ip>`. Esperar a cloud-init: `ssh kraken@<ip> cloud-init status --wait`.
3. **Restaurar.** `sudo /opt/kraken/deploy/scripts/dr-restore.sh desastre <vault> <sha-en-producción>
   <inicio-ISO-UTC>` (o `ensayo` sin la hora). Trae los secretos, restaura el repo2 hasta el último WAL, levanta
   Postgres (`kraken-dr-postgres`) y la app de un nodo con TLS en HAProxy, y escribe el informe en
   `/var/log/kraken-dr/` con la duración de cada paso y hasta cuándo llegan los datos.
4. **DNS** (solo en un desastre). Apuntar el registro A del dominio a la IP pública de la VM. Entra ID, Graph y
   SharePoint no cambian: la URL es la misma. Anotar en el informe cuándo responde
   `https://<dominio>/api/health/ready` desde fuera: ese es el RTO real.
5. **Verificar.** Iniciar sesión, abrir un CV y una bolsa, revisar que la bandeja de correo salga. En un ensayo,
   entrar desde un equipo con el dominio apuntado a la VM en su archivo `hosts`; el worker no corre (no envía
   correos ni corre jobs) y la base no archiva.
6. **Durante el desastre** la base archiva al repo2 en una línea de tiempo nueva y saca un completo al terminar
   el paso 3 (`/var/log/kraken-dr/primer-completo.log`). **El regreso** se planifica con DIMANET: ventana de
   corte, respaldo completo desde Azure restaurado en db-01, Patroni reconstruye las réplicas, DNS de vuelta.
7. **Al terminar un ensayo:** `az vm delete` y los recursos `<prefijo>-dr-*` del grupo (el storage y el Key
   Vault tienen bloqueo y no se tocan).

LIMITACIÓN: en Azure no hay WAF ni réplica; es un nodo para sostener la operación mientras vuelve el sitio.

## Qué está validado

| Pieza | Estado | Cómo |
|---|---|---|
| Imágenes `app` y `worker` | Validado | `docker build`; app sirve `/login` y `/api/health/ready`; worker migra con `pnpm migrate:deploy` y se niega a arrancar sin Graph en producción |
| `app/haproxy.cfg` | Validado | `haproxy -c` en la imagen oficial 3.0 |
| `app/compose.yml`, `db/compose.yml`, `ops/compose.yml` | Validado (sintaxis) | `docker compose config` |
| `scripts/*.sh` | Validado (sintaxis) | `bash -n` |
| CI (`.github/workflows/ci.yml`) | Por validar | Primer PR en GitHub |
| Patroni + etcd, conmutación del primario | **No validado** | Requiere las tres VMs de base |
| pgBackRest (TLS, NAS, Azure), timers | **No validado** | Requiere ops-01, NAS y cuenta de Azure |
| `azure/backup.bicep`, `azure/dr.bicep` | Validado (compilación) | `az bicep build`; sin desplegar |
| `dr/haproxy.dr.cfg`, `dr/compose.dr.yml` | Validado (sintaxis) | `haproxy -c` con certificado de prueba; `docker compose config` con el override |
| keepalived, despliegue nodo por nodo | **No validado** | Requiere app-01 y app-02 |
| Restauración en staging | **No validado** | Requiere stg-01 y un primer respaldo |
| DR en Azure | **No validado** | Primer ensayo con DIMANET |
