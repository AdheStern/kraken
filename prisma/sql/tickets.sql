-- prisma/sql/tickets.sql
-- Restricciones del esquema tickets: registros de tiempo sin solapes por persona y valores positivos (AGENTS.md §2.6).

-- REGLA: los registros de una misma persona no se solapan; fin nulo = abierto, solapa con todo lo posterior.
ALTER TABLE tickets.registro_tiempo
  ADD CONSTRAINT registro_tiempo_rango_ck CHECK (fin IS NULL OR fin > inicio),
  ADD CONSTRAINT registro_tiempo_sin_solape_ex EXCLUDE USING gist (
    usuario_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  );

ALTER TABLE tickets.ticket_bolsa
  ADD CONSTRAINT ticket_bolsa_prioridad_ck CHECK (prioridad >= 1);

ALTER TABLE tickets.sla_politica
  ADD CONSTRAINT sla_politica_minutos_ck CHECK (minutos_primera_respuesta > 0 AND minutos_resolucion > 0);

-- REGLA: el historial de estados es inmutable; el SLA se recalcula desde él (AGENTS.md §2.7, ADR-03).
CREATE FUNCTION tickets.evento_estado_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tickets.evento_estado es inmutable; registra un evento nuevo'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER evento_estado_inmutable BEFORE UPDATE OR DELETE ON tickets.evento_estado
  FOR EACH ROW EXECUTE FUNCTION tickets.evento_estado_inmutable();
