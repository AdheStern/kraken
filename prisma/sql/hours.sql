-- prisma/sql/hours.sql
-- Restricciones del esquema horas: saldo nunca negativo (salvo un contrato sin tope, donde es lo usado) y libro
-- mayor inmutable (AGENTS.md §2.4, ADR-03).

ALTER TABLE horas.bolsa
  ADD CONSTRAINT bolsa_saldo_no_negativo_ck CHECK (saldo_minutos >= 0 OR sin_tope);

ALTER TABLE horas.pendiente_sin_bolsa
  ADD CONSTRAINT pendiente_minutos_ck CHECK (minutos_dentro >= 0 AND minutos_fuera >= 0);

CREATE FUNCTION horas.movimiento_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'horas.movimiento es inmutable; registra un movimiento nuevo (REVERSO o AJUSTE)'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON horas.movimiento
  FOR EACH ROW EXECUTE FUNCTION horas.movimiento_inmutable();
