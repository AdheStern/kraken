-- deploy/sql/pgboss-grants.sql
-- Permisos del usuario de la app sobre el esquema pgboss (ADR-07): solo DML; el DDL lo hace el usuario de
-- migraciones con `pnpm worker:migrate`. {{app_role}} lo reemplaza ese script con el rol de DATABASE_URL.

GRANT USAGE ON SCHEMA pgboss TO {{app_role}};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgboss TO {{app_role}};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgboss TO {{app_role}};
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgboss TO {{app_role}};
