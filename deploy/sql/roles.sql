-- deploy/sql/roles.sql
-- Roles de base de datos (AGENTS.md §4): kraken_migrator es dueño del esquema y corre las migraciones;
-- kraken_app solo lee y escribe datos (sin DDL, TRUNCATE ni DROP). Se corre una vez, como superusuario,
-- sobre la base vacía y ANTES de la primera migración: los privilegios por defecto alcanzan a todo lo que
-- kraken_migrator cree después. Reemplazar las claves antes de correrlo (o usar \password).
-- btree_gist la exige la migración inicial (EXCLUDE con igualdad); se crea aquí como superusuario.

CREATE ROLE kraken_migrator LOGIN PASSWORD '<CLAVE_MIGRACIONES>';
CREATE ROLE kraken_app LOGIN PASSWORD '<CLAVE_APP>';

CREATE DATABASE kraken OWNER kraken_migrator;
\connect kraken

REVOKE ALL ON DATABASE kraken FROM PUBLIC;
GRANT CONNECT ON DATABASE kraken TO kraken_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- REGLA: todo esquema, tabla y secuencia que cree kraken_migrator queda con DML para la app, nunca con DDL.
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator GRANT USAGE ON SCHEMAS TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migrator GRANT EXECUTE ON FUNCTIONS TO kraken_app;

-- OPCIONAL: lectura para las restauraciones de prueba y los tableros de operación (sin escritura); sin este rol,
-- lectura-grants.sql no hace nada.
-- REGLA: nunca el esquema auth (sesiones vivas, tokens, hash de la cuenta de emergencia); los permisos se dan por
-- esquema en deploy/sql/lectura-grants.sql, que aplica `pnpm worker:migrate` después de cada migración.
CREATE ROLE kraken_lectura LOGIN PASSWORD '<CLAVE_LECTURA>';
GRANT CONNECT ON DATABASE kraken TO kraken_lectura;
