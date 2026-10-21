-- CreateEnum
CREATE TYPE "inv"."ReceiptOrigin" AS ENUM ('COMPRA_LOCAL', 'IMPORTACION', 'INVENTARIO_INICIAL');

-- CreateEnum
CREATE TYPE "inv"."AdjustmentOrigin" AS ENUM ('MANUAL', 'CONTEO', 'TRASPASO');

-- CreateEnum
CREATE TYPE "inv"."ReservationMovementKind" AS ENUM ('CREAR', 'AJUSTE', 'LIBERAR', 'CONSUMIR', 'REABRIR');

-- AlterEnum
ALTER TYPE "inv"."SerialStatus" ADD VALUE 'BAJA';

-- AlterTable
ALTER TABLE "inv"."movimiento" ADD COLUMN     "clave_idempotencia" TEXT,
ADD COLUMN     "numero" SERIAL NOT NULL,
ADD COLUMN     "origen_ingreso" "inv"."ReceiptOrigin";

-- AlterTable
ALTER TABLE "inv"."movimiento_linea" DROP COLUMN "costo_unit_usd",
ADD COLUMN     "devuelve_linea_id" UUID,
ADD COLUMN     "saldo_cantidad" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "saldo_valor_usd" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "traspaso_linea_id" UUID,
ADD COLUMN     "valor_usd" DECIMAL(18,2) NOT NULL;

-- AlterTable
ALTER TABLE "inv"."reserva" ADD COLUMN     "linea_origen_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "inv"."solicitud_ajuste" ADD COLUMN     "origen" "inv"."AdjustmentOrigin" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "inv"."stock" DROP COLUMN "costo_promedio_usd",
ADD COLUMN     "valor_usd" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inv"."traspaso_linea" DROP COLUMN "cantidad_recibida",
ADD COLUMN     "valor_enviado_usd" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "inv"."reserva_movimiento" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "tipo" "inv"."ReservationMovementKind" NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "version_id" UUID,
    "movimiento_linea_id" UUID,
    "motivo" TEXT,
    "actor_id" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reserva_movimiento_reserva_id_creado_en_idx" ON "inv"."reserva_movimiento"("reserva_id", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "almacen_fisico_ciudad_unico" ON "inv"."almacen"("ciudad_id") WHERE (tipo = 'FISICO' AND activo);

-- CreateIndex
CREATE UNIQUE INDEX "almacen_transito_unico" ON "inv"."almacen"("tipo") WHERE (tipo = 'TRANSITO');

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_numero_key" ON "inv"."movimiento"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_clave_idempotencia_key" ON "inv"."movimiento"("clave_idempotencia");

-- CreateIndex
CREATE INDEX "movimiento_linea_devuelve_linea_id_idx" ON "inv"."movimiento_linea"("devuelve_linea_id");

-- CreateIndex
CREATE INDEX "movimiento_linea_traspaso_linea_id_idx" ON "inv"."movimiento_linea"("traspaso_linea_id");

-- CreateIndex
CREATE UNIQUE INDEX "reserva_activa_unica" ON "inv"."reserva"("linea_origen_id") WHERE (estado = 'ACTIVA');

-- AddForeignKey
ALTER TABLE "inv"."movimiento_linea" ADD CONSTRAINT "movimiento_linea_devuelve_linea_id_fkey" FOREIGN KEY ("devuelve_linea_id") REFERENCES "inv"."movimiento_linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento_linea" ADD CONSTRAINT "movimiento_linea_traspaso_linea_id_fkey" FOREIGN KEY ("traspaso_linea_id") REFERENCES "inv"."traspaso_linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva_movimiento" ADD CONSTRAINT "reserva_movimiento_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "inv"."reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva_movimiento" ADD CONSTRAINT "reserva_movimiento_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva_movimiento" ADD CONSTRAINT "reserva_movimiento_movimiento_linea_id_fkey" FOREIGN KEY ("movimiento_linea_id") REFERENCES "inv"."movimiento_linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva_movimiento" ADD CONSTRAINT "reserva_movimiento_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;


-- prisma/sql/inventory.sql (inventario valorizado y libro de reservas)
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
