-- AlterTable
ALTER TABLE "tickets"."solicitud" ADD COLUMN     "cliente_id" UUID;

-- AddForeignKey
ALTER TABLE "tickets"."solicitud" ADD CONSTRAINT "solicitud_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
