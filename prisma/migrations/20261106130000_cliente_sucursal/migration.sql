-- Sucursales o subdirecciones de un cliente (decisión 2026-11-06).
-- CreateTable
CREATE TABLE "core"."cliente_sucursal" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "municipio_id" UUID,
    "telefono" TEXT,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cliente_sucursal_cliente_id_idx" ON "core"."cliente_sucursal"("cliente_id");

-- AddForeignKey
ALTER TABLE "core"."cliente_sucursal" ADD CONSTRAINT "cliente_sucursal_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cliente_sucursal" ADD CONSTRAINT "cliente_sucursal_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "core"."municipio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

