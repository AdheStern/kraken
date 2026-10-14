// src/server/entra/sync-entra-roles.ts
// En cada inicio de sesión con Microsoft deja los roles de origen ENTRA de la persona iguales a lo que dan sus
// grupos (AGENTS.md ADR-05, §2.9). Los roles asignados a mano no se tocan.
import {
  computeEntraRoles,
  readGroupClaim,
  roleKey,
} from "@/domain/auth/entra-roles";
import { prisma, type Tx } from "@/server/db";

export type EntraSyncResult = "synced" | "overage";

type AccountRecord = {
  userId?: unknown;
  providerId?: unknown;
  idToken?: unknown;
};

// REGLA: solo las cuentas de Microsoft traen grupos; la de emergencia (contraseña) conserva sus roles manuales.
export async function syncEntraRolesFromAccount(account: AccountRecord) {
  if (account.providerId !== "microsoft") return;
  if (typeof account.userId !== "string" || typeof account.idToken !== "string")
    return;
  const result = await syncEntraRoles(account.userId, account.idToken);
  if (result === "overage")
    console.warn(
      `[syncEntraRoles] el token de ${account.userId} no trae sus grupos (overage); conserva sus roles de Entra.`,
    );
}

// POR QUÉ: el ID token llega del intercambio de código con Entra por el canal del servidor; solo se lee, no se
// vuelve a verificar.
export async function syncEntraRoles(
  userId: string,
  idToken: string,
  db: Pick<typeof prisma, "$transaction"> = prisma,
): Promise<EntraSyncResult> {
  const claim = readGroupClaim(decodeJwtPayload(idToken));
  // LIMITACIÓN: con overage se conservan los roles de la sesión anterior; se configura el claim con los grupos
  // asignados a la aplicación para que no ocurra.
  if (claim.kind === "overage") return "overage";
  await db.$transaction((tx) => applyRoles(tx, userId, claim.groupIds));
  return "synced";
}

async function applyRoles(tx: Tx, userId: string, groupIds: string[]) {
  // TRAMPA: en el primer inicio de sesión la cuenta puede crearse antes que el perfil, del que cuelgan los roles.
  await tx.userProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  const mappings = await tx.entraGroupRole.findMany({
    select: { entraGroupId: true, roleId: true, areaId: true },
  });
  const wanted = computeEntraRoles(groupIds, mappings);
  const wantedKeys = new Set(wanted.map(roleKey));
  const current = await tx.userRole.findMany({
    where: { userId },
    select: { id: true, roleId: true, areaId: true, source: true },
  });
  const stale = current.filter(
    (r) => r.source === "ENTRA" && !wantedKeys.has(roleKey(r)),
  );
  if (stale.length > 0)
    await tx.userRole.deleteMany({
      where: { id: { in: stale.map((r) => r.id) } },
    });
  // TRAMPA: si ya lo tiene a mano, no se duplica (unicidad usuario, rol, área); queda como manual.
  const held = new Set(current.map(roleKey));
  const missing = wanted.filter((r) => !held.has(roleKey(r)));
  if (missing.length > 0)
    await tx.userRole.createMany({
      data: missing.map((r) => ({ ...r, userId, source: "ENTRA" as const })),
    });
}

function decodeJwtPayload(token: string): unknown {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    // POR QUÉ: un token ilegible se trata como "sin grupos": quita los roles de Entra en vez de conservarlos.
    return null;
  }
}
