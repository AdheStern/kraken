-- CreateEnum
CREATE TYPE "tickets"."TicketRequestStatus" AS ENUM ('PENDIENTE', 'ATENDIDA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "tickets"."solicitud" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "solicitante_id" TEXT NOT NULL,
    "area_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "tickets"."TicketRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "ticket_id" UUID,
    "atendida_por_id" TEXT,
    "motivo_descarte" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendida_en" TIMESTAMPTZ,

    CONSTRAINT "solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_numero_key" ON "tickets"."solicitud"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_ticket_id_key" ON "tickets"."solicitud"("ticket_id");

-- CreateIndex
CREATE INDEX "solicitud_area_id_estado_idx" ON "tickets"."solicitud"("area_id", "estado");

-- CreateIndex
CREATE INDEX "solicitud_solicitante_id_idx" ON "tickets"."solicitud"("solicitante_id");

-- AddForeignKey
ALTER TABLE "tickets"."solicitud" ADD CONSTRAINT "solicitud_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."solicitud" ADD CONSTRAINT "solicitud_atendida_por_id_fkey" FOREIGN KEY ("atendida_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."solicitud" ADD CONSTRAINT "solicitud_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."solicitud" ADD CONSTRAINT "solicitud_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- prisma/sql/tickets.sql: atendida ⇔ enlazada a su ticket; descartada exige motivo (AGENTS.md §2.6).
ALTER TABLE tickets.solicitud
  ADD CONSTRAINT solicitud_atendida_ck CHECK ((estado = 'ATENDIDA') = (ticket_id IS NOT NULL)),
  ADD CONSTRAINT solicitud_descartada_ck CHECK (estado <> 'DESCARTADA' OR motivo_descarte IS NOT NULL);
