-- AlterTable
ALTER TABLE "horas"."bolsa" ADD COLUMN     "aviso_vence_hoy_en" TIMESTAMPTZ,
ADD COLUMN     "aviso_vencimiento_en" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "horas"."movimiento" ALTER COLUMN "actor_id" DROP NOT NULL;
