-- deploy/sql/roles.sql
-- Roles de base de datos (AGENTS.md §4): kraken_migra es dueño del esquema y corre las migraciones;
-- kraken_app solo lee y escribe datos (sin DDL, TRUNCATE ni DROP). Se corre una vez, como superusuario,
-- sobre la base vacía y ANTES de la primera migración: los privilegios por defecto alcanzan a todo lo que
-- kraken_migra cree después. Reemplazar las claves antes de correrlo (o usar \password).

CREATE ROLE kraken_migra LOGIN PASSWORD '<CLAVE_MIGRACIONES>';
CREATE ROLE kraken_app LOGIN PASSWORD '<CLAVE_APP>';

CREATE DATABASE kraken OWNER kraken_migra;
\connect kraken

REVOKE ALL ON DATABASE kraken FROM PUBLIC;
GRANT CONNECT ON DATABASE kraken TO kraken_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- REGLA: todo esquema, tabla y secuencia que cree kraken_migra queda con DML para la app, nunca con DDL.
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migra GRANT USAGE ON SCHEMAS TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migra
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migra
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO kraken_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migra GRANT EXECUTE ON FUNCTIONS TO kraken_app;

-- Lectura para las restauraciones de prueba y los tableros de operación (sin escritura).
CREATE ROLE kraken_lectura LOGIN PASSWORD '<CLAVE_LECTURA>';
GRANT CONNECT ON DATABASE kraken TO kraken_lectura;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migra GRANT USAGE ON SCHEMAS TO kraken_lectura;
ALTER DEFAULT PRIVILEGES FOR ROLE kraken_migra GRANT SELECT ON TABLES TO kraken_lectura;
