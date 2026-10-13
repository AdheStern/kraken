-- AlterTable
ALTER TABLE "cv"."linea" ADD COLUMN     "linea_origen_id" UUID;

-- CreateIndex
CREATE INDEX "linea_linea_origen_id_idx" ON "cv"."linea"("linea_origen_id");
