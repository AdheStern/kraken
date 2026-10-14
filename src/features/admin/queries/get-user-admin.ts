// src/features/admin/queries/get-user-admin.ts
// Un usuario para su ficha de administración (perfil, estado, roles) y los catálogos para asignarle roles.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import { prisma } from "@/server/db";
import { ROLE_AREA_RULES } from "../role-area-rules";
import type { UserAdminDetail, UserAdminOptions } from "../types";
import { toRoleView, USER_ROLE_SELECT } from "./list-users";

export async function getUserAdmin(
  userId: string,
  viewerId: string,
): Promise<UserAdminDetail | null> {
  const p = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      isActive: true,
      cityId: true,
      jobTitle: true,
      user: { select: { name: true, email: true, image: true } },
      city: { select: { code: true } },
      roles: { select: USER_ROLE_SELECT, orderBy: { createdAt: "asc" } },
    },
  });
  if (!p) return null;
  return {
    id: p.userId,
    name: p.user.name,
    email: p.user.email,
    image: p.user.image,
    city: p.city?.code ?? null,
    cityId: p.cityId,
    jobTitle: p.jobTitle,
    isActive: p.isActive,
    isSelf: p.userId === viewerId,
    roles: p.roles.map(toRoleView),
  };
}

export async function getUserAdminOptions(): Promise<UserAdminOptions> {
  const active = {
    where: { isActive: true },
    orderBy: { code: "asc" as const },
  };
  const [roles, areas, cities] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.area.findMany(active),
    prisma.city.findMany(active),
  ]);
  return {
    roles: roles.map((r) => ({
      code: r.code,
      name: r.name,
      areaRule: ROLE_AREA_RULES[r.code],
    })),
    areas: areas.map((a) => ({ id: a.id, label: `${a.code} · ${a.name}` })),
    cities: cities.map((c) => ({ id: c.id, label: c.name })),
  };
}
