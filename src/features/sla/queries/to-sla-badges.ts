// src/features/sla/queries/to-sla-badges.ts
// Mediciones guardadas del SLA → datos del semáforo, con la advertencia según sla.alerta_pct (AGENTS.md §2.7).
import type { SlaKind, SlaStatus } from "@/generated/prisma/enums";
import { getIntParameter } from "@/server/parameters";
import type { SlaBadgeData } from "../types";

const DEFAULT_ALERT_PCT = 75;

type Measurement = {
  kind: SlaKind;
  status: SlaStatus;
  elapsedMinutes: number;
  targetMinutes: number;
  dueAt: Date | null;
};

export async function getSlaAlertPct(): Promise<number> {
  return getIntParameter("sla.alerta_pct", DEFAULT_ALERT_PCT);
}

export function toSlaBadge(m: Measurement, alertPct: number): SlaBadgeData {
  return {
    kind: m.kind,
    status: m.status,
    elapsedMinutes: m.elapsedMinutes,
    targetMinutes: m.targetMinutes,
    dueAt: m.dueAt?.toISOString() ?? null,
    isWarning: m.elapsedMinutes * 100 >= alertPct * m.targetMinutes,
  };
}

// POR QUÉ: la tarjeta muestra el reloj que importa ahora: la primera respuesta mientras no se dé, luego la
// resolución.
export function pickCurrentSla(
  measurements: readonly Measurement[],
  alertPct: number,
): SlaBadgeData | null {
  const first = measurements.find((m) => m.kind === "PRIMERA_RESPUESTA");
  const resolution = measurements.find((m) => m.kind === "RESOLUCION");
  const current =
    first && (first.status === "EN_CURSO" || first.status === "PAUSADO")
      ? first
      : (resolution ?? first);
  return current ? toSlaBadge(current, alertPct) : null;
}
