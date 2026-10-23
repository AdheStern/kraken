// src/features/dashboards/queries/get-approval-times.ts
// Tiempo de aprobación de las versiones aprobadas en el periodo (mediana de envío → aprobación) y la solicitud
// pendiente más antigua (AGENTS.md §2.3 "Sin delegación", §6). Alcance de CV con scopeCvQuery (regla 7).
import type { Clock } from "@/domain/clock";
import { median } from "@/domain/dashboards/stats";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import type { ApprovalTimes } from "../types";

const MINUTE_MS = 60_000;

export async function getApprovalTimes(
  user: SessionUser,
  period: { start: Date; end: Date },
  clock: Clock = systemClock,
): Promise<ApprovalTimes> {
  const visibleCv = {
    cv: { AND: [scopeCvQuery(user), { isOpeningBalance: false }] },
  };
  const [approved, oldest] = await Promise.all([
    prisma.cvVersion.findMany({
      where: {
        ...visibleCv,
        submittedAt: { not: null },
        approvedAt: { gte: period.start, lt: period.end },
      },
      select: { submittedAt: true, approvedAt: true },
    }),
    prisma.cvApprovalRequest.findFirst({
      where: {
        status: "PENDIENTE",
        version: { status: "EN_APROBACION", ...visibleCv },
      },
      orderBy: { createdAt: "asc" },
      select: {
        kind: true,
        createdAt: true,
        area: { select: { code: true } },
        version: {
          select: {
            number: true,
            cv: {
              select: {
                id: true,
                code: true,
                customer: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    approvedCount: approved.length,
    medianMinutes: median(
      approved.flatMap(({ submittedAt, approvedAt }) =>
        submittedAt && approvedAt
          ? [
              Math.floor(
                (approvedAt.getTime() - submittedAt.getTime()) / MINUTE_MS,
              ),
            ]
          : [],
      ),
    ),
    oldestPending: oldest && {
      cvId: oldest.version.cv.id,
      versionLabel: toCvVersionLabel(
        oldest.version.cv.code,
        oldest.version.number,
      ),
      customerName: oldest.version.cv.customer.name,
      requestLabel:
        oldest.kind === "GERENCIA_GENERAL"
          ? "Gerencia general"
          : `Gerente ${oldest.area?.code ?? "de área"}`,
      waitingMinutes: Math.floor(
        (clock.now().getTime() - oldest.createdAt.getTime()) / MINUTE_MS,
      ),
    },
  };
}
