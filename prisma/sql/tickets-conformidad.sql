-- prisma/sql/tickets-conformidad.sql
-- Conformidad del cliente (§2.11, decisión 2026-11-05): nota 1–5 solo si está conforme; si no, comentario
-- obligatorio. Inmutable: corregir es volver a resolver y responder de nuevo.

ALTER TABLE tickets.conformidad ADD CONSTRAINT conformidad_nota_o_comentario CHECK (
  (conforme AND calificacion BETWEEN 1 AND 5)
  OR (NOT conforme AND calificacion IS NULL AND length(btrim(coalesce(comentario, ''))) > 0)
);

CREATE FUNCTION tickets.conformidad_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tickets.conformidad es inmutable'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER conformidad_inmutable BEFORE UPDATE OR DELETE ON tickets.conformidad
  FOR EACH ROW EXECUTE FUNCTION tickets.conformidad_inmutable();
