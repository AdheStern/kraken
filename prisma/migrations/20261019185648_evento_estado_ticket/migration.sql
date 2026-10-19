-- AlterTable
ALTER TABLE "tickets"."registro_tiempo" ADD COLUMN     "aviso_olvido_en" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "tickets"."ticket_bolsa" ADD COLUMN     "aviso_proyeccion_en" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "tickets"."evento_estado" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "de" "tickets"."TicketStatus",
    "a" "tickets"."TicketStatus" NOT NULL,
    "actor_id" TEXT,
    "ocurrido_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_estado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_estado_ticket_id_ocurrido_en_idx" ON "tickets"."evento_estado"("ticket_id", "ocurrido_en");

-- AddForeignKey
ALTER TABLE "tickets"."evento_estado" ADD CONSTRAINT "evento_estado_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."evento_estado" ADD CONSTRAINT "evento_estado_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- prisma/sql/tickets.sql (historial de estados inmutable)
-- REGLA: el historial de estados es inmutable; el SLA se recalcula desde él (AGENTS.md §2.7, ADR-03).
CREATE FUNCTION tickets.evento_estado_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tickets.evento_estado es inmutable; registra un evento nuevo'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER evento_estado_inmutable BEFORE UPDATE OR DELETE ON tickets.evento_estado
  FOR EACH ROW EXECUTE FUNCTION tickets.evento_estado_inmutable();
