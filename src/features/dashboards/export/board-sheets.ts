// src/features/dashboards/export/board-sheets.ts
// Lo que muestra cada tablero, en hojas para Excel: resumen, serie y desglose de ventas; utilización y tickets de
// operación; almacenes de inventario (AGENTS.md §6 "exportación"). Mismos datos, mismo alcance que la pantalla.
import type { SheetSpec } from "@/server/dashboards/sheets-to-xlsx";
import type {
  InventoryDashboard,
  OperationsDashboard,
  SalesDashboard,
} from "../types";

// POR QUÉ: el monto llega como texto exacto; Excel guarda números y el formato de celda muestra 2 decimales.
const n = (value: string | null) => (value === null ? null : Number(value));
const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

const SUMMARY_COLUMNS = [
  { header: "Indicador", key: "label", width: 34 },
  { header: "Valor", key: "value", width: 18 },
  { header: "Detalle", key: "detail", width: 40 },
];

export function salesSheets(board: SalesDashboard): SheetSpec[] {
  return [
    {
      name: `Resumen ${board.periodLabel}`,
      columns: SUMMARY_COLUMNS,
      rows: [
        {
          label: "Ventas aprobadas (US$)",
          value: n(board.sales.valueUsd),
          detail: `Meta: ${board.sales.goalUsd ?? "—"}`,
        },
        {
          label: "Margen bruto (US$)",
          value: n(board.margin.valueUsd),
          detail: `${board.margin.marginPct ?? "—"}%`,
        },
        {
          label: "Factor ponderado",
          value: n(board.factor),
          detail: "Solo líneas con costo",
        },
        {
          label: "Servicios propios (US$)",
          value: n(board.ownServicesUsd),
          detail: "",
        },
        {
          label: "Horas vendidas",
          value: hours(board.hoursSold.minutes),
          detail: "En horas",
        },
        { label: "CV cerrados", value: board.cvCount, detail: "" },
      ],
    },
    {
      name: "Por mes",
      columns: [
        { header: "Mes", key: "month", width: 12 },
        { header: "Ventas (US$)", key: "sale", format: "usd" },
        { header: "Meta (US$)", key: "goal", format: "usd" },
      ],
      rows: board.monthly.map((m) => ({
        month: m.month,
        sale: n(m.saleUsd),
        goal: n(m.goalUsd),
      })),
    },
    {
      name: `Desglose ${board.breakdown.dimension.toLowerCase()}`,
      columns: [
        { header: "Grupo", key: "label", width: 34 },
        { header: "Ventas (US$)", key: "sale", format: "usd" },
        { header: "Margen (US$)", key: "margin", format: "usd" },
        { header: "Margen %", key: "marginPct", format: "pct" },
        { header: "Participación %", key: "share", format: "pct" },
        { header: "CV", key: "cvs", format: "int" },
      ],
      rows: board.breakdown.rows.map((r) => ({
        label: r.label,
        sale: n(r.saleUsd),
        margin: n(r.marginUsd),
        marginPct: n(r.marginPct),
        share: r.sharePct,
        cvs: r.cvCount,
      })),
    },
  ];
}

export function operationsSheets(board: OperationsDashboard): SheetSpec[] {
  const { hours: h, sla } = board;
  return [
    {
      name: `Resumen ${board.periodLabel}`,
      columns: [
        { header: "Indicador", key: "label", width: 40 },
        { header: "Valor", key: "value", width: 14 },
      ],
      rows: [
        { label: "Horas vendidas", value: hours(h.soldMinutes) },
        {
          label: "Horas descontadas (ponderadas)",
          value: hours(h.consumedWeightedMinutes),
        },
        {
          label: "Horas reales de tickets cerrados",
          value: hours(h.consumedRealMinutes),
        },
        { label: "Horas vencidas sin usar", value: hours(h.expiredMinutes) },
        { label: "Horas pendientes sin bolsa", value: hours(h.pendingMinutes) },
        { label: "SLA de resolución %", value: sla.resolution.pct },
        { label: "SLA de primera respuesta %", value: sla.firstResponse.pct },
        { label: "Fuera de horario %", value: board.outsideHoursPct },
        { label: "Registros tardíos %", value: board.lateEntriesPct },
        { label: "Bolsas en riesgo hoy", value: board.bagsAtRisk.count },
      ],
    },
    {
      name: "Utilización",
      columns: [
        { header: "Ingeniero", key: "name", width: 34 },
        { header: "Horas registradas", key: "logged" },
        { header: "Horas hábiles", key: "capacity" },
        { header: "Utilización %", key: "pct", format: "pct" },
      ],
      rows: board.utilization.map((u) => ({
        name: u.name,
        logged: hours(u.loggedMinutes),
        capacity: u.capacityMinutes === null ? null : hours(u.capacityMinutes),
        pct: u.pct,
      })),
    },
  ];
}

export function inventorySheets(board: InventoryDashboard): SheetSpec[] {
  return [
    {
      name: `Resumen ${board.periodLabel}`,
      columns: SUMMARY_COLUMNS,
      rows: [
        {
          label: "Valor del inventario hoy (US$)",
          value: n(board.totalValueUsd),
          detail: "",
        },
        {
          label: "Salidas netas (US$)",
          value: n(board.outboundUsd),
          detail: "Salidas menos devoluciones",
        },
        {
          label: "Valor al inicio (US$)",
          value: n(board.openingUsd),
          detail: "",
        },
        {
          label: "Valor al cierre (US$)",
          value: n(board.closingUsd),
          detail: "",
        },
        {
          label: "Rotación",
          value: n(board.turnover),
          detail: "Salidas ÷ valor promedio",
        },
        {
          label: "En tránsito (US$)",
          value: n(board.transit.valueUsd),
          detail: `${board.transit.transfers} traspasos`,
        },
      ],
    },
    {
      name: "Almacenes",
      columns: [
        { header: "Almacén", key: "name", width: 34 },
        { header: "Valor (US$)", key: "value", format: "usd" },
      ],
      rows: board.warehouses.map((w) => ({
        name: w.name,
        value: n(w.valueUsd),
      })),
    },
  ];
}
