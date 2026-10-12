-- prisma/sql/audit.sql
-- Restricciones del esquema audit: los eventos de auditoría no se modifican ni se borran (ADR-14).

CREATE FUNCTION audit.evento_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.evento es inmutable'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER evento_inmutable BEFORE UPDATE OR DELETE ON audit.evento
  FOR EACH ROW EXECUTE FUNCTION audit.evento_inmutable();
