-- Recorridos guiados ya vistos por cada persona (decisión 2026-11-05).
CREATE TABLE "core"."recorrido_visto" (
    "usuario_id" TEXT NOT NULL,
    "recorrido" TEXT NOT NULL,
    "visto_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recorrido_visto_pkey" PRIMARY KEY ("usuario_id","recorrido")
);

ALTER TABLE "core"."recorrido_visto" ADD CONSTRAINT "recorrido_visto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;
