// src/features/dashboards/queries/load-utilization.ts
// Utilización por ingeniero: minutos reales registrados en el periodo sobre los minutos hábiles de su ciudad
// (AGENTS.md §6). Qué ingenieros ve cada rol lo decide scopeEngineerQuery (regla 7).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { TimeInterval } from "@/domain/calendar/split-by-business-hours";
import {
  capacityMinutes,
  loggedMinutesIn,
  utilizationPct,
} from "@/domain/dashboards/utilization";
import type { SessionUser } from "@/server/authz/roles";
import { scopeEngineerQuery } from "@/server/authz/scope-engineer-query";
import { loadBusinessCalendar } from "@/server/calendar/load-business-calendar";
import { prisma } from "@/server/db";
import type { UtilizationRow } from "../types";

// POR QUÉ: el periodo en curso se mide hasta ahora; la capacidad de los días que faltan aún no se pudo usar.
export async function loadUtilization(
  user: SessionUser,
  window: TimeInterval,
  areaId: string | null,
): Promise<UtilizationRow[]> {
  const engineers = await prisma.userProfile.findMany({
    where: {
      AND: [
        scopeEngineerQuery(user),
        { isActive: true },
        areaId
          ? { roles: { some: { role: { code: "INGENIERO" }, areaId } } }
          : {},
      ],
    },
    select: { userId: true, cityId: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: { in: engineers.map((e) => e.userId) },
      endedAt: { gt: window.start },
      startedAt: { lt: window.end },
    },
    select: { userId: true, startedAt: true, endedAt: true },
  });
  const capacityByCity = await loadCapacities(engineers, window);
  return engineers.map((engineer) => {
    const logged = loggedMinutesIn(
      entries.flatMap((e) =>
        e.userId === engineer.userId && e.endedAt
          ? [{ start: e.startedAt, end: e.endedAt }]
          : [],
      ),
      window,
    );
    // LIMITACIÓN: sin ciudad en su perfil no hay calendario contra el cual medir; se muestra sin porcentaje.
    const capacity = engineer.cityId
      ? (capacityByCity.get(engineer.cityId) ?? null)
      : null;
    return {
      userId: engineer.userId,
      name: engineer.user.name,
      loggedMinutes: logged,
      capacityMinutes: capacity,
      pct: capacity === null ? null : utilizationPct(logged, capacity),
    };
  });
}

async function loadCapacities(
  engineers: readonly { cityId: string | null }[],
  window: TimeInterval,
): Promise<Map<string, number>> {
  const cityIds = [
    ...new Set(engineers.flatMap((e) => (e.cityId ? [e.cityId] : []))),
  ];
  const range = {
    from: toBusinessDate(window.start),
    to: toBusinessDate(window.end),
  };
  const capacities = await Promise.all(
    cityIds.map(async (cityId) => {
      const calendar = await loadBusinessCalendar(prisma, cityId, range);
      return [cityId, capacityMinutes(window, calendar)] as const;
    }),
  );
  return new Map(capacities);
}
