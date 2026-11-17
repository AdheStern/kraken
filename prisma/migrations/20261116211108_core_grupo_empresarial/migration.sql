-- Grupo empresarial de clientes hermanos y su vínculo en core.cliente (AGENTS.md §2.9, decisión 2026-11-16).
-- AlterTable
ALTER TABLE "core"."cliente" ADD COLUMN     "grupo_id" UUID;

-- CreateTable
CREATE TABLE "core"."grupo_empresarial" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_empresarial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grupo_empresarial_nombre_normalizado_key" ON "core"."grupo_empresarial"("nombre_normalizado");

-- CreateIndex
CREATE INDEX "cliente_grupo_id_idx" ON "core"."cliente"("grupo_id");

-- AddForeignKey
ALTER TABLE "core"."cliente" ADD CONSTRAINT "cliente_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "core"."grupo_empresarial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
