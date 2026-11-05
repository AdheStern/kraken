-- Avisos de renovación enviados, uno por linaje de línea y umbral de días (job renewals.notify, AGENTS.md §2.1, §7).
CREATE TABLE "cv"."aviso_renovacion" (
    "id" UUID NOT NULL,
    "linea_origen_id" UUID NOT NULL,
    "dias" INTEGER NOT NULL,
    "enviado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aviso_renovacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aviso_renovacion_linea_origen_id_dias_key" ON "cv"."aviso_renovacion"("linea_origen_id", "dias");
