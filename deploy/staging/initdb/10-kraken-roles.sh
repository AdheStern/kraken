#!/bin/sh
# deploy/staging/initdb/10-kraken-roles.sh
# Primer arranque del Postgres de staging (docker-entrypoint-initdb.d, solo con el volumen vacío): los mismos roles,
# base, extensión y privilegios por defecto que deploy/sql/roles.sql, con las claves de /etc/kraken/postgres.env.
# TRAMPA: si el archivo pierde el permiso de ejecución, la imagen lo carga con `source`; por eso no usa `exit` ni
# cambia opciones del shell.

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" \
  -v migrator_password="${KRAKEN_MIGRATOR_PASSWORD:?define KRAKEN_MIGRATOR_PASSWORD en postgres.env}" \
  -v app_password="${KRAKEN_APP_PASSWORD:?define KRAKEN_APP_PASSWORD en postgres.env}" <<'SQL'
CREATE ROLE kraken_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE kraken_app LOGIN PASSWORD :'app_password';

CREATE DATABASE kraken OWNER kraken_migrator;
\connect kraken

REVOKE ALL ON DATABASE kraken FROM PUBLIC;
GRANT CONNECT ON DATABASE kraken TO kraken_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- REGLA: todo lo que cree kraken_migrator queda con DML para la app, nunca con DDL (AGENTS.md §4).
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator GRANT USAGE ON SCHEMAS TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator GRANT EXECUTE ON FUNCTIONS TO kraken_app;
SQL
