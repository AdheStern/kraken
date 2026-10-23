-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "dash";

-- CreateEnum
CREATE TYPE "dash"."GoalIndicator" AS ENUM ('VENTAS_USD', 'MARGEN_USD', 'HORAS_VENDIDAS');

-- CreateTable
CREATE TABLE "dash"."meta" (
    "id" UUID NOT NULL,
    "area_id" UUID,
    "indicador" "dash"."GoalIndicator" NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valor_usd" DECIMAL(18,2),
    "minutos" INTEGER,
    "actualizado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_unica" ON "dash"."meta"("area_id", "indicador", "anio", "mes");

-- AddForeignKey
ALTER TABLE "dash"."meta" ADD CONSTRAINT "meta_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dash"."meta" ADD CONSTRAINT "meta_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- prisma/sql/dashboards.sql
-- Restricciones del esquema dash que Prisma no expresa: unicidad con área nula, mes válido y una sola magnitud
-- por indicador (AGENTS.md §6, regla 4).

-- POR QUÉ: area_id nulo es la meta de la empresa; con NULLS DISTINCT podría cargarse dos veces el mismo mes.
DROP INDEX dash.meta_unica;
CREATE UNIQUE INDEX meta_unica ON dash.meta (area_id, indicador, anio, mes) NULLS NOT DISTINCT;

ALTER TABLE dash.meta
  ADD CONSTRAINT meta_mes_ck CHECK (mes BETWEEN 1 AND 12),
  ADD CONSTRAINT meta_magnitud_ck CHECK (
    CASE indicador
      WHEN 'HORAS_VENDIDAS' THEN minutos IS NOT NULL AND minutos >= 0 AND valor_usd IS NULL
      ELSE valor_usd IS NOT NULL AND valor_usd >= 0 AND minutos IS NULL
    END
  );
