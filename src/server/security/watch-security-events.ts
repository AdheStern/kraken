// src/server/security/watch-security-events.ts
// Job security.watch: lee de audit.evento el último tramo cerrado y avisa a los administradores del sistema de
// los intentos fallidos repetidos y de cada uso de la cuenta de emergencia (ISO 27001 A.8.16, ADR-14).
import type { Clock } from "@/domain/clock";
import {
  accountsCrossingThreshold,
  attemptsReadFrom,
  FAILED_SIGN_IN_THRESHOLD,
  lastClosedSlice,
  type Slice,
} from "@/domain/security/security-alert-rules";
import type { PrismaClient } from "@/generated/prisma/client";
import { notify } from "@/server/notifications/notify";

export type WatchSecurityResult = {
  failedAccounts: number;
  emergencySignIns: number;
};

const ADMIN_ROLE = "ADMIN_SISTEMA";

// LIMITACIÓN: sin estado guardado, un tramo en que el worker estuvo caído no se evalúa después.
export async function watchSecurityEvents(
  db: PrismaClient,
  clock: Clock,
): Promise<WatchSecurityResult> {
  const slice = lastClosedSlice(clock.now());
  const failedAccounts = await failedSignInAccounts(db, slice);
  const emergencySignIns = await emergencySignInsIn(db, slice);
  const admins = await activeAdminIds(db);
  await db.$transaction(async (tx) => {
    for (const email of failedAccounts)
      await notify(tx, {
        event: "SEGURIDAD_INTENTOS_FALLIDOS",
        userIds: admins,
        title: `${FAILED_SIGN_IN_THRESHOLD} o más intentos fallidos para ${email}`,
        body: "Alguien probó contraseñas para esa cuenta en los últimos 15 min. Si no fue su dueño, revisa la IP en la auditoría y desactiva la cuenta.",
        link: "/admin/auditoria",
      });
    for (const signIn of emergencySignIns)
      await notify(tx, {
        event: "SEGURIDAD_CUENTA_EMERGENCIA",
        userIds: admins,
        title: `Se usó la cuenta de emergencia ${signIn.email}`,
        body: `Inició sesión con contraseña desde ${signIn.ip ?? "una IP desconocida"}. Si nadie la necesitaba, cambia su contraseña.`,
        link: "/admin/auditoria",
      });
  });
  return {
    failedAccounts: failedAccounts.length,
    emergencySignIns: emergencySignIns.length,
  };
}

async function failedSignInAccounts(db: PrismaClient, slice: Slice) {
  const rows = await db.auditEvent.findMany({
    where: {
      entity: "auth.intento",
      action: "INICIO_FALLIDO",
      createdAt: { gte: attemptsReadFrom(slice), lt: slice.to },
    },
    select: { entityId: true, createdAt: true },
  });
  return accountsCrossingThreshold(
    rows.map((r) => ({ email: r.entityId, at: r.createdAt })),
    slice,
  );
}

// REGLA: la cuenta de emergencia es la que tiene ADMIN_SISTEMA y entra con contraseña (ADR-05); por Entra no lo es.
async function emergencySignInsIn(db: PrismaClient, slice: Slice) {
  const rows = await db.auditEvent.findMany({
    where: {
      entity: "auth.user",
      action: "INICIAR_SESION",
      after: { path: ["method"], equals: "CONTRASENA" },
      createdAt: { gte: slice.from, lt: slice.to },
    },
    select: { actorId: true, ip: true },
  });
  const ids = rows.flatMap((r) => (r.actorId ? [r.actorId] : []));
  if (ids.length === 0) return [];
  const admins = await db.user.findMany({
    where: {
      id: { in: ids },
      profile: { roles: { some: { role: { code: ADMIN_ROLE } } } },
    },
    select: { id: true, email: true },
  });
  const emailById = new Map(admins.map((a) => [a.id, a.email]));
  return rows.flatMap((r) => {
    const email = r.actorId ? emailById.get(r.actorId) : undefined;
    return email ? [{ email, ip: r.ip }] : [];
  });
}

async function activeAdminIds(db: PrismaClient): Promise<string[]> {
  const rows = await db.userRole.findMany({
    where: { role: { code: ADMIN_ROLE }, user: { isActive: true } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}
