// src/features/admin/queries/get-access-review.ts
// Datos de la revisión periódica de accesos (ISO 27001 A.5.18): cada cuenta con sus roles, su último inicio de
// sesión y si está sin uso, y aparte los roles asignados a mano.
// LIMITACIÓN: sin alcance por usuario; la exportación solo se abre con canManageSystem.
import { isDormantAccount } from "@/domain/auth/access-review";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export type AccessReviewAccount = {
  name: string;
  email: string;
  kind: "Personal" | "Cliente" | "Emergencia";
  customer: string | null;
  isActive: boolean;
  roles: string;
  lastSignInAt: Date | null;
  isDormant: boolean;
};

export type AccessReviewManualRole = {
  name: string;
  email: string;
  role: string;
  area: string | null;
  grantedAt: Date;
};

type Db = Pick<PrismaClient, "userProfile" | "auditEvent" | "session">;

export async function getAccessReview(now: Date, db: Db = prisma) {
  const [profiles, lastSignIns] = await Promise.all([
    db.userProfile.findMany({
      orderBy: [{ isActive: "desc" }, { user: { name: "asc" } }],
      select: {
        isActive: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            accounts: { select: { providerId: true } },
          },
        },
        customer: { select: { name: true } },
        roles: {
          orderBy: { createdAt: "asc" },
          select: {
            source: true,
            createdAt: true,
            role: { select: { code: true, name: true } },
            area: { select: { code: true } },
          },
        },
      },
    }),
    loadLastSignIns(db),
  ]);
  const accounts: AccessReviewAccount[] = profiles.map((p) => {
    const lastSignInAt = lastSignIns.get(p.user.id) ?? null;
    return {
      name: p.user.name,
      email: p.user.email,
      kind: accountKind(
        p.roles.map((r) => r.role.code),
        p.user.accounts.some((a) => a.providerId === "credential"),
      ),
      customer: p.customer?.name ?? null,
      isActive: p.isActive,
      roles: p.roles
        .map(
          (r) =>
            `${r.role.name}${r.area ? ` (${r.area.code})` : ""}${r.source === "MANUAL" ? " · a mano" : ""}`,
        )
        .join(", "),
      lastSignInAt,
      isDormant: isDormantAccount(
        { isActive: p.isActive, createdAt: p.createdAt, lastSignInAt },
        now,
      ),
    };
  });
  const manualRoles: AccessReviewManualRole[] = profiles.flatMap((p) =>
    p.roles
      .filter((r) => r.source === "MANUAL")
      .map((r) => ({
        name: p.user.name,
        email: p.user.email,
        role: r.role.name,
        area: r.area?.code ?? null,
        grantedAt: r.createdAt,
      })),
  );
  return { accounts, manualRoles };
}

// REGLA: la cuenta de emergencia es la de ADMIN_SISTEMA con contraseña; las de CLIENTE son de empresas (ADR-05).
function accountKind(
  codes: string[],
  hasPassword: boolean,
): AccessReviewAccount["kind"] {
  if (codes.includes("CLIENTE")) return "Cliente";
  return hasPassword && codes.includes("ADMIN_SISTEMA")
    ? "Emergencia"
    : "Personal";
}

// TRAMPA: el rastro de inicios de sesión empieza el 2026-11-04 (ADR-14); antes, la sesión más reciente es la mejor
// pista. Se toma la más nueva de las dos.
async function loadLastSignIns(db: Db): Promise<Map<string, Date>> {
  const [audited, sessions] = await Promise.all([
    db.auditEvent.groupBy({
      by: ["entityId"],
      where: { entity: "auth.user", action: "INICIAR_SESION" },
      _max: { createdAt: true },
    }),
    db.session.groupBy({ by: ["userId"], _max: { createdAt: true } }),
  ]);
  const last = new Map<string, Date>();
  const keep = (id: string, at: Date | null) => {
    const prev = last.get(id);
    if (at && (!prev || at > prev)) last.set(id, at);
  };
  for (const row of audited) keep(row.entityId, row._max.createdAt);
  for (const row of sessions) keep(row.userId, row._max.createdAt);
  return last;
}
