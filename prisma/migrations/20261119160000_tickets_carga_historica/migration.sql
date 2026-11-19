-- Carga histórica de trabajo previo a Kraken (decisión 2026-11-19): marca del ticket histórico y referencia del
-- sistema anterior, única para que repetir la carga no duplique.
-- AlterTable
ALTER TABLE "tickets"."ticket" ADD COLUMN     "es_historico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ref_anterior" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ticket_ref_anterior_key" ON "tickets"."ticket"("ref_anterior");
