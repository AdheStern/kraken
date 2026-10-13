// prisma/seed/roles.ts
// Catálogo de roles (AGENTS.md §1): idempotente, lo comparten todos los seeds.
import type { RoleCode } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";

const ROLE_NAMES: Record<RoleCode, string> = {
  GERENTE_GENERAL: "Gerente general",
  GERENTE_AREA: "Gerente de área",
  COMERCIAL: "Comercial (KAM/AM)",
  PREVENTA: "Preventa",
  INGENIERO: "Ingeniero (postventa)",
  COORDINADOR_SOPORTE: "Coordinador de soporte",
  ALMACEN: "Almacén",
  ADMINISTRACION: "Administración",
  ADMIN_SISTEMA: "Administrador del sistema",
};

export async function upsertRoles(tx: Tx): Promise<void> {
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    await tx.role.upsert({
      where: { code: code as RoleCode },
      create: { code: code as RoleCode, name },
      update: { name },
    });
  }
}
