// src/server/session.ts
// Usuario de la sesión actual con sus roles (Data Access Layer). Toda página o action parte de aquí.
// TRAMPA: lee headers(); con Cache Components debe llamarse dentro de un <Suspense>.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";
import type { SessionUser } from "@/server/authz/roles";
import { prisma } from "@/server/db";

// POR QUÉ: cache() comparte la lectura entre el layout, la página y sus componentes en la misma petición.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      isActive: true,
      roles: { select: { areaId: true, role: { select: { code: true } } } },
    },
  });
  if (!profile?.isActive) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    roles: profile.roles.map((r) => ({ code: r.role.code, areaId: r.areaId })),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
