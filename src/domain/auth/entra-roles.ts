// src/domain/auth/entra-roles.ts
// Roles que dan los grupos de Entra ID de una persona (AGENTS.md ADR-05): lee el claim "groups" del ID token
// y cruza sus grupos con el mapeo grupo → rol + área de core.grupo_entra_rol.

export type GroupClaim =
  | { kind: "groups"; groupIds: string[] }
  // POR QUÉ: con demasiados grupos Entra no los manda en el token ("overage"); no se puede saber cuáles son.
  | { kind: "overage" };

export type EntraGroupMapping = {
  entraGroupId: string;
  roleId: string;
  areaId: string | null;
};

export type GrantedRole = { roleId: string; areaId: string | null };

// REGLA: sin claim "groups" (ningún grupo o claim no configurado) la persona no tiene roles de Entra.
export function readGroupClaim(payload: unknown): GroupClaim {
  if (typeof payload !== "object" || payload === null)
    return { kind: "groups", groupIds: [] };
  const claims = payload as Record<string, unknown>;
  const names = claims._claim_names;
  if (typeof names === "object" && names !== null && "groups" in names)
    return { kind: "overage" };
  const groups = claims.groups;
  if (!Array.isArray(groups)) return { kind: "groups", groupIds: [] };
  return {
    kind: "groups",
    groupIds: groups.filter((g): g is string => typeof g === "string"),
  };
}

// TRAMPA: los id de grupo llegan en minúsculas o mayúsculas según quién los copie; se comparan sin distinguir.
export function computeEntraRoles(
  groupIds: readonly string[],
  mappings: readonly EntraGroupMapping[],
): GrantedRole[] {
  const member = new Set(groupIds.map((id) => id.toLowerCase()));
  const granted = new Map<string, GrantedRole>();
  for (const m of mappings) {
    if (!member.has(m.entraGroupId.toLowerCase())) continue;
    granted.set(roleKey(m), { roleId: m.roleId, areaId: m.areaId });
  }
  return [...granted.values()];
}

export function roleKey(role: GrantedRole): string {
  return `${role.roleId}|${role.areaId ?? ""}`;
}
