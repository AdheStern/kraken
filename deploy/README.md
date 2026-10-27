# Despliegue y operación de Kraken

Runbook para DIMANET (VMs, red, NAS, respaldos) y DIMASOFT (aplicación, base de datos, CI/CD). Arquitectura y
decisiones: [AGENTS.md §3 y §10](../AGENTS.md). Objetivo no negociable: **ninguna pérdida de información**.

> **Estado:** este directorio describe la infraestructura real (tabla siguiente). **Solo se validó lo que dice
> «validado»** en la tabla del final; el resto se valida al aplicarlo en las VMs y se anota ahí.

## Infraestructura real

Ubuntu Server 26.04 en todas las VMs, red `172.22.12.0/24`, relojes en UTC. Docker usa `10.250.0.0/24` (docker0) y
`10.251.0.0/16` (redes de compose).

| VM | IP | Qué corre |
|---|---|---|
| `lpzvmkrkapp01` | 172.22.12.112 | Docker Compose (`app/compose.yml`): Next.js, worker, HAProxy (TLS y base por `:5000`); keepalived en el sistema. **Aún no creada** |
| `lpzvmkrkapp02` | 172.22.12.113 (reservada) | Igual que app01. Después |
| IP virtual | 172.22.12.206 | keepalived; el FortiGate publica el 443 de `kraken.dima.com.bo` hacia esta IP |
| `lpzvmkrkdb01` | 172.22.12.114 | PostgreSQL 18.6 **nativo** con Patroni 4.1.5 y etcd, clúster `kraken`; API de Patroni en `:8008` (`/primary` = 200 solo en el primario). Base `kraken` |
| `lpzvmkrkdb02` | (por definir) | Réplica del clúster. Después; no habrá db03 por ahora |
| `lpzvmkrkops01` | 172.22.12.116 | pgBackRest por SSH con cron; monitoreo propio en `/opt/monitoring` (Prometheus, Alertmanager, Grafana); runner de GitHub |
| `lpzvmkrkstg01` | 172.22.12.117 | Staging en un solo nodo con Docker (`staging/compose.yml`): `stg-kraken.dima.com.bo`, solo red interna |

**Base de datos:** roles `kraken_migrator` (dueño, DDL; solo lo usa el servicio `migrate`) y `kraken_app` (solo DML).
`btree_gist` y `pg_stat_statements` ya están en `public`. `kraken_lectura` es opcional.

## Mapa de archivos

| Dónde corre | Archivo | Qué es |
|---|---|---|
| Desarrollo | `compose.dev.yml` | Postgres 18 y Mailpit |
| app01, app02 | `app/compose.yml` | Next.js, worker, `migrate` (perfil), HAProxy y Alloy (perfil `logs`) |
| app01, app02 | `app/haproxy/haproxy.cfg` | `:443` TLS → Next de los nodos (sale el que falle `/api/health/ready`); `:80` redirige; `:5000` → primario de Patroni; stats en `STATS_BIND_IP` y `127.0.0.1:8404` |
| app01, app02 | `app/keepalived.conf` | IP virtual 172.22.12.206 (en el sistema operativo, no en Docker) |
| app01, app02 | `app/*.env.example`, `app/alloy.river` | Plantillas de `/etc/kraken/app.env`, `migrate.env` (solo el servicio `migrate`) y `haproxy.env`; Alloy sin destino aún |
| stg01 | `staging/compose.yml`, `staging/haproxy/`, `staging/initdb/` | Staging completo: mismas imágenes, Postgres 18 propio, HAProxy solo web con TLS, Mailpit (interfaz en `172.22.12.117:8025`) y adjuntos en el volumen `files` |
| stg01 | `staging/*.env.example` | Plantillas de `/etc/kraken/app.env` (de `staging.env.example`), `migrate.env` y `postgres.env` |
| ops01 (runner) | `scripts/deploy.sh`, `hosts/*` | Copia los archivos del entorno a `/opt/kraken/` (rsync), escribe `KRAKEN_TAG` en `/opt/kraken/.env`, migra y despliega nodo por nodo por SSH |
| Primera vez | `sql/roles.sql` | Roles `kraken_migrator` (dueño, DDL), `kraken_app` (solo DML), `kraken_lectura` (opcional) y `btree_gist` |
| Cada despliegue | `sql/pgboss-grants.sql`, `sql/lectura-grants.sql` | Los aplica `worker:migrate`: DML de pg-boss para la app; lectura sin el esquema `auth` |
| Azure (una vez) | `azure/backup.bicep` | Storage del repo2 con inmutabilidad por versión y Key Vault de recuperación, con bloqueos |
| ops01, app0X | `scripts/escrow-secrets.sh` | Custodia en el Key Vault la configuración de pgBackRest, los env y el certificado |
| **Pendiente de adaptar** | `backup/*`, `scripts/restore-test.sh` | Escritos para pgBackRest por TLS con timers de systemd y Postgres 16; la infraestructura real usa **pgBackRest por SSH y cron** en ops01 |
| **Pendiente de adaptar** | `azure/dr.bicep`, `azure/dr-cloud-init.yaml`, `scripts/dr-restore.sh`, `dr/*` | Recuperación en Azure; supone Postgres 16 y el repo2 de `backup/` |

## SharePoint para adjuntos y documentación

Los adjuntos de tickets y los documentos de proyecto (AGENTS.md §2.10, ADR-16) van a una biblioteca de SharePoint
por Microsoft Graph. Sin estas variables, en producción no se puede subir nada (en desarrollo se usa `./.files`).

1. **Sitio.** En DIMA es el del equipo de Teams «Kraken»: `https://dima4.sharepoint.com/teams/Kraken`, biblioteca
   «Documentos compartidos». `SHAREPOINT_FOLDER=Kraken` es la carpeta del canal estándar «Kraken», así los archivos
   se ven en la pestaña Archivos de ese canal. Staging usa otra carpeta (`Kraken-staging`).
2. **Registro de app** (Entra → Registros de aplicaciones → Nuevo registro): `Kraken SharePoint`, solo este
   inquilino, sin URI de redirección. El id de aplicación va en `SHAREPOINT_CLIENT_ID`; el inquilino es el mismo
   `ENTRA_TENANT_ID` del inicio de sesión.
3. **Permiso:** Permisos de API → Microsoft Graph → permiso de **aplicación** `Sites.Selected` → conceder
   consentimiento de administrador. Por sí solo no da acceso a ningún sitio.
4. **Secreto:** Certificados y secretos → nuevo secreto (24 meses). Su **valor** (no el id) va en
   `SHAREPOINT_CLIENT_SECRET`; anotar el vencimiento para rotarlo antes.
5. **Escritura solo sobre el sitio de Kraken**, en Graph Explorer con una cuenta de administrador que consienta
   `Sites.FullControl.All` delegado:
   - `GET https://graph.microsoft.com/v1.0/sites/<tenant>.sharepoint.com:/sites/Kraken` → `id` del sitio.
   - `POST https://graph.microsoft.com/v1.0/sites/{site-id}/permissions` con
     `{"roles":["write"],"grantedToIdentities":[{"application":{"id":"<SHAREPOINT_CLIENT_ID>","displayName":"Kraken SharePoint"}}]}`.
6. **Biblioteca:** `GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives` → el `id` de «Documentos»
   (empieza con `b!`) va en `SHAREPOINT_DRIVE_ID`.
7. **Variables** en `/etc/kraken/app.env` de cada nodo de producción (dueño `root:deploy`, permisos 640) y en el
   Key Vault (`scripts/escrow-secrets.sh`); reiniciar la app.
8. **Verificar:** subir un documento a un proyecto en `/documentacion` → aparece en
   `Documentos/Kraken/documentacion/{cliente}/{proyecto}/{fase}/` y se descarga desde Kraken.

A las personas se les da, si se quiere, **solo lectura** en el sitio: un archivo borrado o movido desde SharePoint
deja de descargarse en Kraken. Subir y quitar se hace siempre desde Kraken.

## Puesta en marcha (orden)

**Archivos de cada nodo.** `deploy.sh` copia en cada despliegue los archivos del repositorio a `/opt/kraken/` y
escribe `KRAKEN_TAG=<sha>` en `/opt/kraken/.env` sin tocar sus otras líneas; lo demás es del nodo y se prepara una
vez. Los `.env` de `/etc/kraken` los lee `docker compose`, que corre como `deploy`:
```
sudo install -d -o deploy -g deploy -m 755 /opt/kraken
sudo install -d -o root -g deploy -m 750 /etc/kraken
sudo install -d -o root -g root -m 700 /etc/kraken/tls
sudo chown root:deploy /etc/kraken/*.env && sudo chmod 640 /etc/kraken/*.env
sudo chown root:root /etc/kraken/tls/kraken.pem && sudo chmod 600 /etc/kraken/tls/kraken.pem
```
`/opt/kraken/.env` (dueño `deploy`) lleva `NODE_IP` en producción y, solo si las imágenes no están en
`ghcr.io/adhestern`, `KRAKEN_REGISTRY`. Nunca se copia desde el repositorio.

1. **Base de datos** (hecho por DIMANET). Si se recrea: `psql -f sql/roles.sql` como `postgres` en el primario, con
   las claves reemplazadas (las extensiones ya existentes no se tocan).
2. **SSH del usuario `deploy` en lpzvmkrkops01.** `deploy.sh` se conecta a los nombres de `hosts/*`; su
   `~/.ssh/config` los resuelve:
   ```
   Host lpzvmkrkstg01
     HostName 172.22.12.117
   Host lpzvmkrkapp01
     HostName 172.22.12.112
   # Host lpzvmkrkapp02
   #   HostName 172.22.12.113
   Host lpzvmkrk*
     User deploy
     IdentityFile ~/.ssh/id_ed25519
   ```
   En cada nodo, el usuario `deploy` con esa clave pública, en el grupo `docker` y con `sudo` sin clave solo para
   `socat` (el socket de HAProxy). Probar con `ssh lpzvmkrkstg01 docker ps` desde ops01.
3. **Certificado.** PEM con el certificado de `kraken.dima.com.bo` (o `stg-kraken.dima.com.bo`), su cadena y la clave
   en `/etc/kraken/tls/kraken.pem` (permisos 600, dueño root) de cada nodo.
4. **Staging (lpzvmkrkstg01).** `deploy.sh` copia a `/opt/kraken` `staging/compose.yml`, `staging/haproxy/` y
   `staging/initdb/`. En `/etc/kraken`: `app.env` (de `staging.env.example`, con `APP_ENV=staging`), `migrate.env` y
   `postgres.env`, dueño `root:deploy` y permisos 640. Con `APP_ENV=staging` el correo va al Mailpit del compose
   (interfaz en `http://172.22.12.117:8025`, solo red interna), los adjuntos al volumen `files` (`FILES_ROOT`) y la
   interfaz muestra «Entorno de pruebas»: staging no necesita Graph ni SharePoint. Las claves de `postgres.env`
   tienen que coincidir con las de las URL de `app.env` y `migrate.env`: `initdb/` crea los roles con ellas en el
   primer arranque (volumen vacío). En Entra, agregar la URI de redirección
   `https://stg-kraken.dima.com.bo/api/auth/callback/microsoft`.
5. **Producción (lpzvmkrkapp01).** `deploy.sh` copia a `/opt/kraken` `app/compose.yml`, `app/haproxy/` y
   `app/alloy.river`; a mano, un `/opt/kraken/.env` con `NODE_IP=172.22.12.112`. En `/etc/kraken`: `app.env` (con
   `APP_ENV=production`), `migrate.env` y `haproxy.env` (con `STATS_BIND_IP=172.22.12.112`), dueño `root:deploy` y
   permisos 640. `MIGRATION_DATABASE_URL` va solo en `migrate.env`. keepalived en el sistema con `app/keepalived.conf`
   (`state BACKUP` con `nopreempt`, `virtual_router_id 206`, IP virtual en `ens33`, unicast sin autenticación y el
   chequeo como `keepalived_script`). Su `unicast_peer` lleva desde ya 172.22.12.113, la IP reservada para
   lpzvmkrkapp02: vacío, keepalived vuelve a multicast. Su `track_script` se descomenta **recién con HAProxy corriendo** en el nodo,
   después del primer despliegue: antes, el chequeo fallaría y soltaría la IP virtual.
   **`TRUSTED_PROXIES`** lleva la IP del FortiGate, las IPs de los nodos de app y los rangos `10.250.0.0/24` y
   `10.251.0.0/16`: el HAProxy local llega al contenedor desde la red de Docker.
6. **lpzvmkrkapp02 (172.22.12.113, después).** Descomentar su servidor en `app/haproxy/haproxy.cfg` (el despliegue
   lo lleva a los dos nodos) y en `hosts/production`, keepalived en app02 (`priority 100`, `unicast_src_ip
   172.22.12.113` y `unicast_peer` 172.22.12.112), su `Host` en `~/.ssh/config` de ops01 y sumar 172.22.12.113 a
   `TRUSTED_PROXIES`. Al sumar lpzvmkrkdb02,
   descomentar su servidor en `backend pg_primary`.
7. **CI/CD.** Runner autoalojado de GitHub en lpzvmkrkops01 con la etiqueta `ops-01`. En GitHub: entornos `staging` y
   `production` (este con aprobación obligatoria) y la variable `CI_RUNNER=ops-01` si CI debe correr ahí.
8. **Primer despliegue.** Desde GitHub, *Deploy → Run workflow*. El script migra (`pnpm migrate:deploy`: Prisma,
   esquema de pg-boss y catálogos base) y actualiza nodo por nodo; staging primero.
9. **Cuenta de emergencia.** Una vez por entorno: `docker compose -f /opt/kraken/compose.yml --profile migrate run
   --rm -e SUPERADMIN_EMAIL=… -e SUPERADMIN_PASSWORD=… migrate pnpm db:seed:admin`.
10. **Monitoreo.** En `/opt/monitoring` de ops01 (fuera de este repositorio): raspar `http://172.22.12.112:8404/metrics`
    y avisar si `https://kraken.dima.com.bo/api/health/ready` falla.
11. **Logs (cuando Loki tenga destino).** Poner su URL en `alloy.river` y levantar Alloy con
    `docker compose -f /opt/kraken/compose.yml --profile logs up -d alloy`.

## Operación diaria

- **Sacar un nodo a mano:** `echo "set server app/lpzvmkrkapp01 state drain" | sudo socat stdio
  /run/haproxy/admin.sock` en cada nodo de app (`state ready` para volverlo).
- **Cambio de primario:** `patronictl -c /etc/patroni/patroni.yml switchover` en lpzvmkrkdb01 (Patroni nativo).
  HAProxy corta las conexiones al viejo primario y la app reconecta sola.
- **Estado del HAProxy:** `curl -s http://127.0.0.1:8404/` en el nodo.
- **Cambios en `haproxy.cfg`:** los aplica el despliegue. `deploy.sh` compara el sha256 del archivo nuevo con el de
  cada nodo y, si cambió, guarda el anterior en `/opt/kraken/haproxy.cfg.bak`, valida el nuevo en **todos** los nodos
  (`haproxy -c` con la imagen del compose y el certificado real) y recién entonces lo recarga nodo por nodo con
  `docker compose kill -s HUP haproxy`: el master carga la configuración y los workers viejos terminan sus
  conexiones abiertas, sin corte. Verifica en el log del contenedor que la carga fue exitosa, que el contenedor
  sigue arriba, que `:443` responde y, en producción, el socket de administración. Si la validación o una recarga
  falla, restaura el `.bak` en todos los nodos (y recarga los que ya había recargado) y aborta antes de migraciones,
  imágenes y contenedores: ningún nodo queda con un `haproxy.cfg` distinto de los demás.
  TRAMPA: los compose montan la **carpeta** `/opt/kraken/haproxy/`, no el archivo; con el archivo montado, el
  contenedor seguiría viendo el anterior después del rsync (otro inodo). El `/opt/kraken/haproxy.cfg` suelto que dejó
  la versión anterior se puede borrar.
- **Recarga a mano (emergencia):** editar `/opt/kraken/haproxy/haproxy.cfg` en el nodo, validarlo
  (`docker run --rm --user root -v /opt/kraken/haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro -v
  /etc/kraken/tls/kraken.pem:/etc/kraken/tls/kraken.pem:ro haproxy:3.0-alpine haproxy -c -f
  /usr/local/etc/haproxy/haproxy.cfg`, más `--env-file /etc/kraken/haproxy.env` en producción) y recargar con
  `docker compose -f /opt/kraken/compose.yml kill -s HUP haproxy`. El próximo despliegue lo vuelve a dejar como
  en el repositorio: el cambio tiene que llegar también a `app/haproxy/` o `staging/haproxy/`.
- **Cambios en el servicio `haproxy` de `compose.yml`** (imagen, montajes): `up -d` recrea el contenedor y ese nodo
  deja de atender unos segundos; el despliegue lo hace nodo por nodo y lo deja en el log. Con dos nodos y el
  `track_script` de keepalived activo, la IP virtual pasa al otro mientras tanto; **con un solo nodo (hoy
  lpzvmkrkapp01 y staging) hay un corte de unos segundos.**
- **keepalived:** el despliegue no lo toca; su configuración es manual (paso 5 de la puesta en marcha).
- **Respaldos y restauración de prueba:** los opera DIMANET con pgBackRest por SSH y cron desde ops01; los archivos
  de `backup/` y `scripts/restore-test.sh` están **pendientes de adaptar** a ese esquema.

## Recuperación ante desastre en Azure (en frío)

> **Pendiente de adaptar:** este procedimiento supone Postgres 16 y el repo2 de `backup/` en Azure. La base real es
> 18.6 con pgBackRest por SSH; hay que alinear `azure/dr*`, `dr/*` y `scripts/dr-restore.sh` antes del primer ensayo.

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
| Imágenes `app` y `worker` | Validado | `docker build --target app` y `--target worker` |
| `app/haproxy/`, `staging/haproxy/`, `dr/haproxy/` | Validado (sintaxis) | `haproxy -c` en `haproxy:3.0-alpine` con un certificado autofirmado temporal |
| `app/compose.yml`, `staging/compose.yml`, `compose.dev.yml`, override de DR | Validado (sintaxis) | `docker compose config` |
| `staging/initdb/10-kraken-roles.sh` | Validado | `postgres:18-alpine` vacío → roles, base, `btree_gist`; `pnpm migrate:deploy` como `kraken_migrator`; `kraken_app` con DML y sin DDL |
| PostgreSQL 18 | Validado | `pnpm test:int` completo sobre `postgres:18-alpine` |
| `scripts/*.sh` | Validado (sintaxis) | `bash -n` |
| `scripts/deploy.sh` | Validado (simulado) | `ssh`, `rsync` y `docker` falsos sobre dos nodos: archivos por entorno, `KRAKEN_TAG` sin tocar las demás líneas de `.env`, `haproxy.cfg` sin cambios no toca HAProxy, cambio válido se recarga en ambos, inválido o recarga fallida restauran todos y abortan antes de migrar, recreación de `haproxy` en el log |
| Recarga de HAProxy | Validado | `haproxy:3.0-alpine` con la carpeta montada: rsync-like (renombrado) + HUP sirve la configuración nueva sin cortar al worker anterior; un archivo roto da `Loading failure` y sigue el anterior |
| `app/keepalived.conf` | Validado (sintaxis) | `keepalived --config-test` 2.3.1 en Alpine con `eth0` en lugar de `ens33`; con un peer, BACKUP → MASTER por unicast |
| keepalived en la VM, TLS real, despliegue por SSH | **No validado** | Requiere lpzvmkrkapp01, el certificado y el `~/.ssh/config` de ops01 |
| Staging de punta a punta | **No validado** | Requiere lpzvmkrkstg01 con los env y el primer despliegue |
| Respaldos, restauración de prueba y DR | **Pendiente de adaptar** | pgBackRest por SSH y cron; Postgres 18 |
