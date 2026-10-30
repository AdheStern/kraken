-- AlterTable
ALTER TABLE "cv"."linea" ADD COLUMN     "color" VARCHAR(6);

-- prisma/sql/cv.sql: color de la fila
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_color_ck CHECK (color IS NULL OR color ~ '^[0-9A-F]{6}$');
