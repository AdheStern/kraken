// src/server/session-user.ts
// Arma el usuario de la sesión desde su perfil: roles y, en una cuenta del portal, su empresa y lo que puede
// hacer (AGENTS.md §2.11). Pura, para probarla sin base.
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type ProfileFacts = {
  isActive: boolean;
  roles: { areaId: string | null; role: { code: RoleCode } }[];
  customer: {
    id: string;
    isActive: boolean;
    portalSeesBags: boolean;
    portalRequests: boolean;
    portalComments: boolean;
  } | null;
};

export function toSessionUser(
  authUser: AuthUser,
  profile: ProfileFacts,
): SessionUser | null {
  if (!profile.isActive) return null;
  const base = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    image: authUser.image ?? null,
  };
  const roles = profile.roles.map((r) => ({
    code: r.role.code,
    areaId: r.areaId,
  }));
  if (!roles.some((r) => r.code === "CLIENTE")) return { ...base, roles };
  // REGLA: la cuenta de un cliente nunca suma permisos internos, aunque tenga otro rol por error; sin empresa
  // activa no entra (§2.11).
  const { customer } = profile;
  if (!customer?.isActive) return null;
  return {
    ...base,
    roles: [{ code: "CLIENTE", areaId: null }],
    customer: {
      customerId: customer.id,
      seesBags: customer.portalSeesBags,
      requestsWork: customer.portalRequests,
      comments: customer.portalComments,
    },
  };
}
