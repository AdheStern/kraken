-- Rubro, tipo de empresa y municipio del cliente; departamentos y municipios de Bolivia (decisión 2026-11-06).
-- CreateEnum
CREATE TYPE "core"."CompanyType" AS ENUM ('PUBLICA', 'PRIVADA', 'MIXTA', 'ONG', 'ORGANISMO_INTERNACIONAL', 'OTRA');

-- AlterTable
ALTER TABLE "core"."cliente" ADD COLUMN     "municipio_id" UUID,
ADD COLUMN     "rubro_id" UUID,
ADD COLUMN     "tipo_empresa" "core"."CompanyType";

-- CreateTable
CREATE TABLE "core"."departamento" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."municipio" (
    "id" UUID NOT NULL,
    "departamento_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."rubro" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rubro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departamento_codigo_key" ON "core"."departamento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "departamento_nombre_key" ON "core"."departamento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "municipio_departamento_id_nombre_key" ON "core"."municipio"("departamento_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rubro_nombre_key" ON "core"."rubro"("nombre");

-- AddForeignKey
ALTER TABLE "core"."municipio" ADD CONSTRAINT "municipio_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "core"."departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cliente" ADD CONSTRAINT "cliente_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "core"."municipio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cliente" ADD CONSTRAINT "cliente_rubro_id_fkey" FOREIGN KEY ("rubro_id") REFERENCES "core"."rubro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

