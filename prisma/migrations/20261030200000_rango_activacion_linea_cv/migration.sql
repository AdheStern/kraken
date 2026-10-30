-- AlterTable
ALTER TABLE "cv"."linea" ADD COLUMN     "activacion_fin" DATE,
ADD COLUMN     "activacion_inicio" DATE;

-- prisma/sql/cv.sql: rango de activación
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_rango_activacion_ck CHECK (
    (activacion_inicio IS NULL AND activacion_fin IS NULL)
    OR (tipo_item = 'INTANGIBLE' AND activacion_inicio IS NOT NULL AND activacion_fin >= activacion_inicio)
  );
