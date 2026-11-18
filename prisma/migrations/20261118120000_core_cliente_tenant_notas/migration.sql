-- Tenant y notas del cliente, opcionales (decisión 2026-11-18).
-- AlterTable
ALTER TABLE "core"."cliente" ADD COLUMN     "notas" TEXT,
ADD COLUMN     "tenant" TEXT;
