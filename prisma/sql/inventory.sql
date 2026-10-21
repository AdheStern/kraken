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

-- (inventario valorizado y libro de reservas, F4)
-- REGLA: el valor es caché del libro y sin cantidad no queda valor; la otra dirección no se exige, porque el
-- redondeo half-up puede dejar cantidad con valor 0 (AGENTS.md §2.8, §15.4).
ALTER TABLE inv.stock
  ADD CONSTRAINT stock_valor_ck CHECK (valor_usd >= 0 AND (cantidad > 0 OR valor_usd = 0));

ALTER TABLE inv.movimiento
  ADD CONSTRAINT movimiento_origen_ingreso_ck CHECK ((tipo = 'INGRESO') = (origen_ingreso IS NOT NULL));

ALTER TABLE inv.movimiento_linea
  ADD CONSTRAINT movimiento_linea_signo_ck CHECK (cantidad <> 0 AND sign(valor_usd) IN (0, sign(cantidad))),
  ADD CONSTRAINT movimiento_linea_saldo_ck CHECK (
    saldo_cantidad >= 0 AND saldo_valor_usd >= 0 AND (saldo_cantidad > 0 OR saldo_valor_usd = 0)
  ),
  ADD CONSTRAINT movimiento_linea_serial_ck CHECK (unidad_serial_id IS NULL OR abs(cantidad) = 1);

ALTER TABLE inv.traspaso_linea
  ADD CONSTRAINT traspaso_linea_cantidad_ck CHECK (
    cantidad_enviada > 0 AND (valor_enviado_usd IS NULL OR valor_enviado_usd >= 0)
  );

ALTER TABLE inv.almacen
  ADD CONSTRAINT almacen_fisico_ciudad_ck CHECK (tipo <> 'FISICO' OR ciudad_id IS NOT NULL);

ALTER TABLE inv.reserva_movimiento
  ADD CONSTRAINT reserva_movimiento_cantidad_ck CHECK (cantidad <> 0);

CREATE TRIGGER reserva_movimiento_inmutable BEFORE UPDATE OR DELETE ON inv.reserva_movimiento
  FOR EACH ROW EXECUTE FUNCTION inv.movimiento_inmutable();
