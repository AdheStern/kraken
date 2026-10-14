// src/features/admin/queries/list-users.ts
// Usuarios con sus roles y ciudad, con búsqueda por nombre o correo; los dados de baja van al final.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import { prisma } from "@/server/db";
import type { UserRoleView, UserRow } from "../types";

const LIMIT = 300;

export const USER_ROLE_SELECT = {
  id: true,
  source: true,
  areaId: true,
  role: { select: { code: true, name: true } },
  area: { select: { code: true } },
} as const;

type RoleRecord = {
  id: string;
  source: "ENTRA" | "MANUAL";
  areaId: string | null;
  role: { code: string; name: string };
  area: { code: string } | null;
};

export function toRoleView(r: RoleRecord): UserRoleView {
  return {
    id: r.id,
    role: r.role.code,
    roleName: r.role.name,
    areaId: r.areaId,
    areaCode: r.area?.code ?? null,
    source: r.source,
  };
}

export async function listUsers(search: string): Promise<UserRow[]> {
  const q = search.trim();
  const profiles = await prisma.userProfile.findMany({
    where: q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {},
    orderBy: [{ isActive: "desc" }, { user: { name: "asc" } }],
    take: LIMIT,
    select: {
      userId: true,
      isActive: true,
      user: { select: { name: true, email: true, image: true } },
      city: { select: { code: true } },
      roles: { select: USER_ROLE_SELECT, orderBy: { createdAt: "asc" } },
    },
  });
  return profiles.map((p) => ({
    id: p.userId,
    name: p.user.name,
    email: p.user.email,
    image: p.user.image,
    city: p.city?.code ?? null,
    isActive: p.isActive,
    roles: p.roles.map(toRoleView),
  }));
}
