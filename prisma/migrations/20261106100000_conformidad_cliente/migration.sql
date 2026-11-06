-- Conformidad del cliente con la resolución de su ticket (§2.11, decisión 2026-11-05).
-- CreateTable
CREATE TABLE "tickets"."conformidad" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "evento_estado_id" UUID NOT NULL,
    "conforme" BOOLEAN NOT NULL,
    "calificacion" INTEGER,
    "comentario" TEXT,
    "autor_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conformidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conformidad_evento_estado_id_key" ON "tickets"."conformidad"("evento_estado_id");

-- CreateIndex
CREATE INDEX "conformidad_ticket_id_idx" ON "tickets"."conformidad"("ticket_id");

-- AddForeignKey
ALTER TABLE "tickets"."conformidad" ADD CONSTRAINT "conformidad_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."conformidad" ADD CONSTRAINT "conformidad_evento_estado_id_fkey" FOREIGN KEY ("evento_estado_id") REFERENCES "tickets"."evento_estado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."conformidad" ADD CONSTRAINT "conformidad_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- prisma/sql/tickets-conformidad.sql
-- Conformidad del cliente (§2.11, decisión 2026-11-05): nota 1–5 solo si está conforme; si no, comentario
-- obligatorio. Inmutable: corregir es volver a resolver y responder de nuevo.

ALTER TABLE tickets.conformidad ADD CONSTRAINT conformidad_nota_o_comentario CHECK (
  (conforme AND calificacion BETWEEN 1 AND 5)
  OR (NOT conforme AND calificacion IS NULL AND length(btrim(coalesce(comentario, ''))) > 0)
);

CREATE FUNCTION tickets.conformidad_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tickets.conformidad es inmutable'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER conformidad_inmutable BEFORE UPDATE OR DELETE ON tickets.conformidad
  FOR EACH ROW EXECUTE FUNCTION tickets.conformidad_inmutable();
