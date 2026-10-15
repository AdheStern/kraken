// src/features/admin/queries/list-audit-events.ts
// Eventos de auditoría, del más nuevo al más viejo, por entidad y rango de fechas, de a 50 con cursor (ADR-14).
// REGLA §2.9: quien no es GG ve los montos ocultos (el administrador del sistema no ve montos por ese rol).
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import { fromZonedTime } from "date-fns-tz";
import { BUSINESS_TIME_ZONE } from "@/domain/calendar/business-date";
import type { Prisma } from "@/generated/prisma/client";
import { redactAmounts } from "@/server/authz/redact-amounts";
import { prisma } from "@/server/db";
import type { AuditEventView, AuditFilters } from "../types";
import { resolveAuditSubjects } from "./resolve-audit-subjects";

const PAGE = 50;

export async function listAuditEvents(
  filters: AuditFilters,
  canSeeAmounts: boolean,
): Promise<{ events: AuditEventView[]; nextCursor: string | null }> {
  const rows = await prisma.auditEvent.findMany({
    where: toWhere(filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, PAGE);
  const [actors, subjects] = await Promise.all([
    actorNames(page.map((r) => r.actorId)),
    resolveAuditSubjects(page),
  ]);
  const show = (value: unknown) =>
    canSeeAmounts ? value : redactAmounts(value);
  return {
    nextCursor: rows.length > PAGE ? page[page.length - 1].id : null,
    events: page.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      actor: r.actorId ? (actors.get(r.actorId) ?? "Usuario eliminado") : null,
      entity: r.entity,
      entityId: r.entityId,
      subject: subjects.get(`${r.entity}|${r.entityId}`) ?? null,
      action: r.action,
      before: show(r.before),
      after: show(r.after),
      ip: r.ip,
    })),
  };
}

function toWhere({
  entity,
  from,
  to,
}: AuditFilters): Prisma.AuditEventWhereInput {
  const day = (date: string) =>
    fromZonedTime(`${date}T00:00:00`, BUSINESS_TIME_ZONE);
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = day(from);
  if (to) createdAt.lt = new Date(day(to).getTime() + 86_400_000);
  return {
    ...(entity ? { entity } : {}),
    ...(from || to ? { createdAt } : {}),
  };
}

// POR QUÉ: actor_id no tiene FK (la auditoría sobrevive a las tablas); el nombre se busca aparte.
async function actorNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}
