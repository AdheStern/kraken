-- AlterTable
ALTER TABLE "cv"."linea" ADD COLUMN     "es_subitem" BOOLEAN NOT NULL DEFAULT false;

-- prisma/sql/cv.sql: una nota no es subítem
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_subitem_solo_item_ck CHECK (tipo_linea = 'ITEM' OR NOT es_subitem);
