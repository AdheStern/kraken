// src/features/tickets/components/historical/historical-columns.ts
// Columnas de la grilla de carga histórica de tickets: etiqueta, ancho, tipo de celda y, en las desplegables, de
// dónde salen sus opciones según la fila (AGENTS.md §2.6, decisión 2026-11-19).
import type { HistoricalRow } from "@/domain/tickets/historical-row-parts";
import { HISTORICAL_STATUSES } from "@/domain/tickets/parse-historical-rows";
import type { TicketFormOptions } from "../../queries/get-ticket-form-options";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../ticket-labels";
import { ticketChoices } from "../new-ticket-choices";

export type HistoricalKey = Exclude<keyof HistoricalRow, "areaIds"> | "areaId";
type Option = { id: string; label: string; hint?: string };
type Column = {
  label: string;
  width: number;
  kind: "text" | "date" | "time" | "select";
  placeholder?: string;
};

export const HISTORICAL_COLUMNS: Record<HistoricalKey, Column> = {
  ref: {
    label: "Ref. anterior",
    width: 110,
    kind: "text",
    placeholder: "T-0001",
  },
  openedOn: {
    label: "Apertura",
    width: 108,
    kind: "date",
    placeholder: "dd/mm/aaaa",
  },
  title: { label: "Título", width: 240, kind: "text" },
  description: {
    label: "Descripción",
    width: 200,
    kind: "text",
    placeholder: "Igual al título",
  },
  customerId: { label: "Cliente", width: 200, kind: "select" },
  cityId: { label: "Ciudad", width: 120, kind: "select" },
  areaId: { label: "Área", width: 120, kind: "select" },
  projectId: { label: "Proyecto", width: 170, kind: "select" },
  priority: { label: "Prioridad", width: 110, kind: "select" },
  ownerId: { label: "Encargado", width: 170, kind: "select" },
  status: { label: "Estado", width: 130, kind: "select" },
  workDate: {
    label: "Fecha del trabajo",
    width: 118,
    kind: "date",
    placeholder: "dd/mm/aaaa",
  },
  from: { label: "Desde", width: 76, kind: "time", placeholder: "hh:mm" },
  to: { label: "Hasta", width: 76, kind: "time", placeholder: "hh:mm" },
  executorId: { label: "Ejecutor", width: 170, kind: "select" },
  bagId: { label: "Bolsa", width: 230, kind: "select" },
  closedOn: {
    label: "Cierre",
    width: 108,
    kind: "date",
    placeholder: "dd/mm/aaaa",
  },
};

export const HISTORICAL_KEYS = Object.keys(
  HISTORICAL_COLUMNS,
) as HistoricalKey[];

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([id, label]) => ({
  id,
  label,
}));
const STATUS_OPTIONS = HISTORICAL_STATUSES.map((id) => ({
  id,
  label: STATUS_LABELS[id],
}));

// POR QUÉ: con fila, las mismas opciones dependientes del alta de ticket (proyectos del cliente, ingenieros del
// área, bolsas elegibles); sin fila (pegar o «Aplicar a todas»), el catálogo completo.
export function optionsFor(
  key: HistoricalKey,
  options: TicketFormOptions,
  row?: HistoricalRow,
): Option[] {
  const choices =
    row &&
    ticketChoices(options, {
      ...row,
      projectId: row.projectId || null,
      ownerId: null,
      bagId: null,
    });
  switch (key) {
    case "customerId":
      return options.customers;
    case "cityId":
      return options.cities;
    case "areaId":
      return options.areas;
    case "projectId":
      return choices?.projects ?? options.projects;
    case "priority":
      return PRIORITY_OPTIONS;
    case "ownerId":
    case "executorId":
      return choices?.engineers ?? options.engineers;
    case "status":
      return STATUS_OPTIONS;
    case "bagId":
      return choices?.bags ?? options.bags;
    default:
      return [];
  }
}

export function cellValue(row: HistoricalRow, key: HistoricalKey): string {
  return key === "areaId" ? (row.areaIds[0] ?? "") : row[key];
}

export function withCell<T extends HistoricalRow>(
  row: T,
  key: HistoricalKey,
  value: string,
): T {
  return key === "areaId"
    ? { ...row, areaIds: value ? [value] : [] }
    : { ...row, [key]: value };
}
