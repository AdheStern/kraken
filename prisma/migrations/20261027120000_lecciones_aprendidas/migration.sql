-- CreateEnum
CREATE TYPE "doc"."DocDocumentKind" AS ENUM ('ARCHIVO', 'LECCION');

-- AlterTable
ALTER TABLE "doc"."documento" ADD COLUMN     "editado_en" TIMESTAMPTZ,
ADD COLUMN     "editado_por_id" TEXT,
ADD COLUMN     "tipo" "doc"."DocDocumentKind" NOT NULL DEFAULT 'ARCHIVO',
ADD COLUMN     "titulo" TEXT;

-- AddForeignKey
ALTER TABLE "doc"."documento" ADD CONSTRAINT "documento_editado_por_id_fkey" FOREIGN KEY ("editado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;


-- REGLA: una lección aprendida siempre tiene título; un archivo subido nunca lo lleva.
ALTER TABLE doc.documento
  ADD CONSTRAINT documento_titulo_ck CHECK ((tipo = 'LECCION') = (titulo IS NOT NULL));
