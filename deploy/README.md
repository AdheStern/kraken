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
| app-01, app-02 | `app/*.env.example` | Plantillas de `/etc/kraken/app.env` y `haproxy.env` |
| db-01..03 | `db/compose.yml`, `db/patroni.yml`, `db/Dockerfile.patroni` | etcd + PostgreSQL 16 + Patroni (réplica síncrona) + pgBackRest |
| db-01..03 | `backup/pgbackrest.db.conf` | Empuja el WAL a ops-01 por TLS |
| ops-01 | `backup/pgbackrest.repo.conf` | Repositorio: NAS (repo1) y Azure inmutable (repo2), cifrados |
| ops-01 | `backup/systemd/kraken-backup*` | Completo domingo 02:00, diferencial diario 02:00 (los adjuntos viven en SharePoint, ADR-16) |
| ops-01 | `ops/compose.yml`, `ops/prometheus.yml` | Prometheus, Loki, Grafana, Uptime Kuma |
| stg-01 | `scripts/restore-test.sh` + `backup/systemd/kraken-restore-test*` | Restauración de prueba mensual |
| ops-01 (runner) | `scripts/deploy.sh`, `hosts/*` | Despliegue nodo por nodo |
| Primera vez | `sql/roles.sql` | Roles `kraken_migra` (DDL), `kraken_app` (solo DML), `kraken_lectura` |

## Valores que pone DIMANET

IPs de la VLAN de aplicación (app-01, app-02, IP virtual) y de datos (db-01..03, ops-01) · interfaz de red
para keepalived · ruta NFS del NAS para pgBackRest (`/mnt/nas/pgbackrest`) ·
cuenta de Azure Storage con el contenedor `pgbackrest` con **inmutabilidad (WORM)** y SAS de
escritura **sin permiso de borrado** · nombre DNS y certificado público en el FortiGate/Radware · sitio de SharePoint
para los adjuntos con un registro de app `Sites.Selected` (escritura solo en ese sitio) y el id de su biblioteca.

## Puesta en marcha (orden)

1. **VMs y red.** Topología de AGENTS.md §10. Discos de base en datastores o LUN distintos si se puede. Solo
   app-01, app-02 y ops-01 llegan al 5432 de los nodos de base.
2. **Certificados de pgBackRest.** Una CA propia y un certificado por nodo (`db-01..03`, `ops-01`) en
   `/etc/kraken/tls` (bases) y `/etc/pgbackrest/tls` (ops-01). El CN de cada certificado es el nombre del nodo.
3. **Base de datos.** En cada db-0X: construir `kraken-patroni:16`, copiar `patroni.yml` (con su nombre e IP),
   `patroni.env`, `pgbackrest.conf` y levantar `db/compose.yml`. Verificar: `curl http://<db>:8008/cluster`
   muestra un líder y dos réplicas, una síncrona.
4. **Roles.** En el primario, como `postgres`: `psql -f sql/roles.sql` (con las claves reemplazadas).
5. **Respaldos.** En ops-01: pgBackRest con `pgbackrest.repo.conf`, `pgbackrest --stanza=kraken stanza-create`
   y `pgbackrest --stanza=kraken check`; instalar y habilitar los timers de `backup/systemd`.
6. **Nodos de aplicación.** En cada app-0X: `/opt/kraken` con `app/compose.yml`, `haproxy.cfg`, `alloy.river`
   y un `.env` con `NODE_IP`; `/etc/kraken/app.env` y `haproxy.env` (permisos 600); keepalived en el sistema.
7. **Operación.** En ops-01: `ops/compose.yml`. En Uptime Kuma, monitores de `https://<dominio>/api/health/ready`
   y de cada nodo, con avisos por correo y Teams.
8. **CI/CD.** Runner autoalojado de GitHub en ops-01 con la etiqueta `ops-01`; usuario `deploy` con su clave
   SSH en los nodos (con permiso de `sudo socat` sobre el socket de HAProxy). En GitHub: entornos `staging` y
   `production` (este con aprobación obligatoria) y la variable `CI_RUNNER=ops-01` si CI debe correr ahí.
9. **Primer despliegue.** Desde GitHub, *Deploy → Run workflow*. El script migra (`pnpm migrate:deploy`:
   Prisma, esquema de pg-boss y catálogos base) y actualiza nodo por nodo.
10. **Cuenta de emergencia.** Una vez: `docker compose -f /opt/kraken/compose.yml --profile migrate run --rm
    -e SUPERADMIN_EMAIL=… -e SUPERADMIN_PASSWORD=… migrate pnpm db:seed:admin`.

## Operación diaria

- **Sacar un nodo a mano:** `echo "set server app/app-01 state drain" | sudo socat stdio /run/haproxy/admin.sock`
  en los dos nodos (`state ready` para volverlo).
- **Cambio de primario:** `patronictl -c /etc/patroni/patroni.yml switchover` dentro del contenedor `postgres`.
  HAProxy corta las conexiones al viejo primario y la app reconecta sola.
- **Restauración de prueba:** el primer domingo de cada mes en stg-01; a mano: `scripts/restore-test.sh 1`
  (NAS) o `2` (Azure). Si falla, revisar `journalctl -u kraken-restore-test`.
- **Logs:** en Grafana, origen Loki, `{servicio="app"} | json | requestId="…"` sigue una petición del borde a la
  base.

## Recuperación ante desastre en Azure (en frío)

Si cae el host o el NAS: crear en Azure una VM con Docker y pgBackRest, restaurar desde **repo2** hasta el
último WAL (`pgbackrest --stanza=kraken --repo=2 restore`), levantar Postgres, desplegar las mismas imágenes de
GHCR con `app/compose.yml` (un solo nodo, `haproxy.env` apuntando a la base local) y cambiar el DNS. Objetivo:
**4 h**. Se ensaya dos veces al año; medir y anotar el tiempo real.

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
| keepalived, despliegue nodo por nodo | **No validado** | Requiere app-01 y app-02 |
| Restauración en staging | **No validado** | Requiere stg-01 y un primer respaldo |
| DR en Azure | **No validado** | Primer ensayo con DIMANET |
