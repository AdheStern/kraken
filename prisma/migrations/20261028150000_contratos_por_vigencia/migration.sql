-- CreateEnum
CREATE TYPE "horas"."BagKind" AS ENUM ('HORAS', 'VIGENCIA');

-- AlterTable
ALTER TABLE "core"."unidad" ADD COLUMN     "es_plazo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "horas"."bolsa" ADD COLUMN     "sin_tope" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" "horas"."BagKind" NOT NULL DEFAULT 'HORAS',
ADD COLUMN     "vigente_desde" DATE;

-- prisma/sql/hours.sql: el saldo de un contrato sin tope es lo usado, en negativo (AGENTS.md §2.4).
ALTER TABLE horas.bolsa DROP CONSTRAINT bolsa_saldo_no_negativo_ck;
ALTER TABLE horas.bolsa
  ADD CONSTRAINT bolsa_saldo_no_negativo_ck CHECK (saldo_minutos >= 0 OR sin_tope);

-- Unidades de plazo ya cargadas (db:seed:base agrega AÑOS donde falte).
UPDATE core.unidad SET es_plazo = true WHERE codigo IN ('MESES', 'AÑOS');
