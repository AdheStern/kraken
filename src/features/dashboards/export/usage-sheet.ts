// src/features/dashboards/export/usage-sheet.ts
// Hoja «Uso de horas» del tablero operativo: por cliente, tecnología y área, horas vendidas, descontadas, % de uso,
// vencidas y sin bolsa (decisión 2026-11-05). Sin montos.
import type { SheetSpec } from "@/server/dashboards/sheets-to-xlsx";
import type { HoursUsageView } from "../types";

const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

const GROUPS = [
  ["byCustomer", "Cliente"],
  ["byTechnology", "Tecnología"],
  ["byArea", "Área"],
] as const;

export function usageSheet(usage: HoursUsageView): SheetSpec {
  return {
    name: "Uso de horas",
    columns: [
      { header: "Agrupado por", key: "group", width: 14 },
      { header: "Grupo", key: "label", width: 34 },
      { header: "Bolsas", key: "bags" },
      { header: "Horas vendidas", key: "sold" },
      { header: "Horas descontadas", key: "consumed" },
      { header: "Uso %", key: "pct", format: "pct" },
      { header: "Horas vencidas", key: "expired" },
      { header: "Horas sin bolsa", key: "pending" },
    ],
    rows: GROUPS.flatMap(([key, group]) =>
      usage[key].map((row) => ({
        group,
        label: row.label,
        bags: row.bags,
        sold: hours(row.soldMinutes),
        consumed: hours(row.consumedMinutes),
        pct: row.usagePct,
        expired: hours(row.expiredMinutes),
        pending: key === "byCustomer" ? hours(row.pendingMinutes) : null,
      })),
    ),
  };
}
