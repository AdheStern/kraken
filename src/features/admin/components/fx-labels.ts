// src/features/admin/components/fx-labels.ts
// Textos del panel de TC: de dónde salió cada TC y fechas de vigencia legibles.
import type { FxRateView } from "../types";

export const FX_SOURCE_LABELS: Record<FxRateView["source"], string> = {
  CUCU: "BCB (vía API de CUCU)",
  MANUAL: "Carga manual",
};

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatFxDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}
