// src/server/fx/get-current-fx.ts
// TC oficial vigente hoy (La Paz) para mostrarlo en el riel: valor, fecha desde la que rige y si está atrasado
// (AGENTS.md §2.2: se muestra el último valor con su fecha y una advertencia si falla el job).
import { differenceInCalendarDays } from "date-fns";
import { toBusinessDate } from "@/domain/calendar/business-date";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { findCurrentFxRate } from "./find-current-fx-rate";

// POR QUÉ: el TC del viernes rige de sábado a lunes; con más de 2 días sin uno nuevo, algo falló.
const STALE_DAYS = 2;

export type CurrentFx = { rate: string; effectiveOn: string; isStale: boolean };

export async function getCurrentFx(): Promise<CurrentFx | null> {
  const today = toBusinessDate(systemClock.now());
  const row = await findCurrentFxRate(prisma, today);
  if (!row) return null;
  const effectiveOn = row.effectiveOn.toISOString().slice(0, 10);
  return {
    // REGLA: el TC se muestra con 2 decimales salvo que tenga más (§15.4).
    rate: row.sellRate.toFixed(Math.max(2, row.sellRate.decimalPlaces())),
    effectiveOn,
    isStale:
      differenceInCalendarDays(new Date(today), new Date(effectiveOn)) >
      STALE_DAYS,
  };
}
