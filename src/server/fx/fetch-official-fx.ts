// src/server/fx/fetch-official-fx.ts
// Guarda el TC oficial en fx.tipo_cambio (ADR-09): si el de hoy ya está, no consulta; si no, lo pide a la
// fuente y guarda el vigente y el de mañana si ya se publicó (AGENTS.md §7 fx.fetch-official).

import { toBusinessDate } from "@/domain/calendar/business-date";
import type { Clock } from "@/domain/clock";
import type { Tx } from "@/server/db";
import type { FxRateProvider } from "./fx-rate-provider";

type Db = Pick<Tx, "fxRate">;

export type FetchOfficialResult =
  | { status: "al-dia" }
  | { status: "guardado"; dates: string[]; hasToday: boolean };

export async function fetchOfficialFx(
  db: Db,
  provider: FxRateProvider,
  clock: Clock,
): Promise<FetchOfficialResult> {
  const today = toBusinessDate(clock.now());
  const existing = await db.fxRate.findUnique({
    where: { effectiveOn_source: { effectiveOn: day(today), source: "CUCU" } },
    select: { id: true },
  });
  // REGLA: una consulta por hora solo mientras falte el de hoy; respeta el límite de la API (§2.2).
  if (existing) return { status: "al-dia" };
  const rates = await provider.fetchOfficial();
  for (const rate of rates) {
    const data = {
      buyRate: rate.buyRate,
      sellRate: rate.sellRate,
      fetchedAt: clock.now(),
    };
    await db.fxRate.upsert({
      where: {
        effectiveOn_source: {
          effectiveOn: day(rate.effectiveOn),
          source: "CUCU",
        },
      },
      create: { effectiveOn: day(rate.effectiveOn), source: "CUCU", ...data },
      update: data,
    });
  }
  const dates = rates.map((r) => r.effectiveOn);
  return { status: "guardado", dates, hasToday: dates.includes(today) };
}

const day = (date: string) => new Date(`${date}T00:00:00Z`);
