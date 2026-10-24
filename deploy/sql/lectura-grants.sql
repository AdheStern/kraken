-- deploy/sql/lectura-grants.sql
-- Lectura para kraken_lectura en los esquemas de negocio, nunca en auth (AGENTS.md §4, §10). Idempotente: lo
-- aplica `pnpm worker:migrate` en cada despliegue, así alcanza a las tablas nuevas. Sin el rol, no hace nada.
DO $$
DECLARE
  esquema text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kraken_lectura') THEN
    RETURN;
  END IF;
  FOREACH esquema IN ARRAY ARRAY['core', 'fx', 'cv', 'horas', 'tickets', 'inv', 'notif', 'audit', 'dash'] LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = esquema) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA %I TO kraken_lectura', esquema);
      EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO kraken_lectura', esquema);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM kraken_lectura;
    REVOKE USAGE ON SCHEMA auth FROM kraken_lectura;
  END IF;
END $$;
