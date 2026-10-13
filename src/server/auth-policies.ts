// src/server/auth-policies.ts
// Reglas de acceso que Better Auth evalúa al iniciar sesión: quién puede entrar con contraseña,
// si la cuenta está activa y el alta del perfil de negocio de cada usuario nuevo.
import { prisma } from "@/server/db";

const PASSWORD_ROLE = "ADMIN_SISTEMA";

// REGLA: el acceso con contraseña es solo la cuenta de emergencia del administrador del sistema;
// el resto del personal entra con Entra ID (AGENTS.md ADR-05).
export async function canSignInWithPassword(email: string): Promise<boolean> {
  const count = await prisma.userRole.count({
    where: {
      role: { code: PASSWORD_ROLE },
      user: { isActive: true, user: { email: email.toLowerCase() } },
    },
  });
  return count > 0;
}

// POR QUÉ: un perfil inexistente aún no fue desactivado; solo bloquea un `activo = false` explícito.
export async function isAccountDisabled(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { isActive: true },
  });
  return profile?.isActive === false;
}

// REGLA: toda FK a una persona apunta a core.usuario_perfil (AGENTS.md §4); se crea con el usuario.
export async function ensureUserProfile(userId: string): Promise<void> {
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
