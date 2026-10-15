/*
  Warnings:

  - You are about to drop the `permiso_excepcion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "core"."permiso_excepcion" DROP CONSTRAINT "permiso_excepcion_otorgado_por_id_fkey";

-- DropForeignKey
ALTER TABLE "core"."permiso_excepcion" DROP CONSTRAINT "permiso_excepcion_usuario_id_fkey";

-- DropTable
DROP TABLE "core"."permiso_excepcion";
