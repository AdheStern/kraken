-- prisma/sql/inventory.sql
-- Restricciones del esquema inv: stock nunca negativo y libro de movimientos inmutable (AGENTS.md §2.8, ADR-03).

ALTER TABLE inv.stock
  ADD CONSTRAINT stock_cantidad_ck CHECK (cantidad >= 0 AND cantidad_reservada >= 0);

ALTER TABLE inv.reserva
  ADD CONSTRAINT reserva_cantidad_ck CHECK (cantidad > 0 AND cantidad_consumida >= 0 AND cantidad_consumida <= cantidad);

ALTER TABLE inv.traspaso
  ADD CONSTRAINT traspaso_almacenes_distintos_ck CHECK (almacen_origen_id <> almacen_destino_id);

CREATE FUNCTION inv.movimiento_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% es inmutable; registra un movimiento nuevo (AJUSTE o DEVOLUCION)', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON inv.movimiento
  FOR EACH ROW EXECUTE FUNCTION inv.movimiento_inmutable();
CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON inv.movimiento_linea
  FOR EACH ROW EXECUTE FUNCTION inv.movimiento_inmutable();
