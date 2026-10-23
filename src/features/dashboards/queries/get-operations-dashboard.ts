// src/features/dashboards/queries/get-operations-dashboard.ts
// Tablero operativo de un periodo: horas, bolsas en riesgo, SLA, tickets, registros y utilización (AGENTS.md
// §6). Sin montos: lo ve también el ingeniero, recortado a lo suyo por los alcances (regla 12).
import type { Clock } from "@/domain/clock";
import { type PeriodRef, resolvePeriod } from "@/domain/dashboards/period";
import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import type { SessionUser } from "@/server/authz/roles";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import type { OperationsDashboard } from "../types";
import { loadHoursFlow } from "./load-hours-flow";
import { loadTicketKpis } from "./load-ticket-kpis";
import { loadUtilization } from "./load-utilization";

const TOP_BAGS = 5;

export async function getOperationsDashboard(
  user: SessionUser,
  input: { period: PeriodRef; areaId: string | null; cityId: string | null },
  clock: Clock = systemClock,
): Promise<OperationsDashboard> {
  const period = resolvePeriod(input.period);
  const filters = { ...input, start: period.start, end: period.end };
  // TRAMPA: un periodo futuro deja la ventana vacía (fin = inicio), no invertida.
  const now = clock.now();
  const end = now < period.end ? now : period.end;
  const window = {
    start: period.start,
    end: end > period.start ? end : period.start,
  };
  const [hours, tickets, utilization, bags, areaCode] = await Promise.all([
    loadHoursFlow(user, filters),
    loadTicketKpis(user, filters),
    loadUtilization(user, window, input.areaId),
    listHourBags(user),
    input.areaId
      ? prisma.area.findUnique({
          where: { id: input.areaId },
          select: { code: true },
        })
      : null,
  ]);
  // POR QUÉ: las bolsas en riesgo son una foto de hoy, no del periodo; el filtro de área usa sus códigos.
  const atRisk = bags.filter(
    (bag) =>
      bag.riskGroup === "EN_RIESGO" &&
      (!areaCode || bag.areaCodes.includes(areaCode.code)),
  );
  return {
    periodLabel: period.label,
    hours,
    bagsAtRisk: { count: atRisk.length, top: atRisk.slice(0, TOP_BAGS) },
    ...tickets,
    utilization,
  };
}
