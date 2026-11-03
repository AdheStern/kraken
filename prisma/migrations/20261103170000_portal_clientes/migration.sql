-- AlterEnum
ALTER TYPE "core"."RoleCode" ADD VALUE 'CLIENTE';

-- AlterTable
ALTER TABLE "core"."cliente" ADD COLUMN     "portal_comenta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portal_pide_trabajo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portal_ve_bolsas" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "core"."usuario_perfil" ADD COLUMN     "cliente_id" UUID;

-- AddForeignKey
ALTER TABLE "core"."usuario_perfil" ADD CONSTRAINT "usuario_perfil_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
