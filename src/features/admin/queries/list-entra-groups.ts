// src/features/admin/queries/list-entra-groups.ts
// Mapeos grupo de Entra → rol + área, agrupados por grupo, con cuántas personas tienen hoy cada rol desde Entra.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import { prisma } from "@/server/db";
import type { EntraGroupView } from "../types";

export async function listEntraGroups(): Promise<EntraGroupView[]> {
  const [mappings, granted] = await Promise.all([
    prisma.entraGroupRole.findMany({
      orderBy: [{ groupName: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        entraGroupId: true,
        groupName: true,
        roleId: true,
        areaId: true,
        role: { select: { name: true } },
        area: { select: { code: true } },
      },
    }),
    prisma.userRole.groupBy({
      by: ["roleId", "areaId"],
      where: { source: "ENTRA" },
      _count: true,
    }),
  ]);
  const people = new Map(
    granted.map((g) => [`${g.roleId}|${g.areaId ?? ""}`, g._count]),
  );
  const groups = new Map<string, EntraGroupView>();
  for (const m of mappings) {
    const group = groups.get(m.entraGroupId) ?? {
      entraGroupId: m.entraGroupId,
      groupName: m.groupName ?? "Sin nombre",
      roles: [],
    };
    group.roles.push({
      id: m.id,
      roleName: m.role.name,
      areaCode: m.area?.code ?? null,
      people: people.get(`${m.roleId}|${m.areaId ?? ""}`) ?? 0,
    });
    groups.set(m.entraGroupId, group);
  }
  return [...groups.values()];
}
