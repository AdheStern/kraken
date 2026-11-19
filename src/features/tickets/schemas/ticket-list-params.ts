// src/features/tickets/schemas/ticket-list-params.ts
// Parámetros de la vista de lista de tickets en la URL (modo, estado, orden, página y filas, además de los
// filtros del tablero) y cómo construir su enlace; un valor inválido vuelve al de defecto (AGENTS.md §5).
import { z } from "zod";
import { TicketStatus } from "@/generated/prisma/enums";

export const TICKET_SORT_KEYS = [
  "numero",
  "titulo",
  "cliente",
  "prioridad",
  "estado",
  "actualizado",
] as const;
export type TicketSortKey = (typeof TICKET_SORT_KEYS)[number];
export type TicketSort = { key: TicketSortKey; direction: "asc" | "desc" };

export const TICKET_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_TICKET_PAGE_SIZE = 25;
const DEFAULT_SORT: TicketSort = { key: "numero", direction: "desc" };

const text = z.string().trim().min(1).optional().catch(undefined);

const schema = z.object({
  modo: z.enum(["tablero", "lista"]).catch("tablero"),
  q: text.transform((q) => q?.replace(/^#/, "")),
  cliente: z.uuid().optional().catch(undefined),
  area: text,
  vista: z.enum(["mios"]).optional().catch(undefined),
  estado: z.enum(TicketStatus).optional().catch(undefined),
  orden: z.enum(TICKET_SORT_KEYS).catch(DEFAULT_SORT.key),
  dir: z.enum(["asc", "desc"]).catch(DEFAULT_SORT.direction),
  pagina: z.coerce.number().int().min(1).catch(1),
  filas: z.coerce
    .number()
    .refine((n) => (TICKET_PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_TICKET_PAGE_SIZE),
});

export type TicketListParams = {
  mode: "tablero" | "lista";
  search?: string;
  customerId?: string;
  areaCode?: string;
  mine: boolean;
  status?: TicketStatus;
  sort: TicketSort;
  page: number;
  pageSize: number;
};

export function parseTicketListParams(
  raw: Record<string, string | string[] | undefined>,
): TicketListParams {
  const p = schema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );
  return {
    mode: p.modo,
    search: p.q,
    customerId: p.cliente,
    areaCode: p.area,
    mine: p.vista === "mios",
    status: p.estado,
    sort: { key: p.orden, direction: p.dir },
    page: p.pagina,
    pageSize: p.filas,
  };
}

// POR QUÉ: cambiar un filtro, el orden o las filas vuelve a la página 1; solo «pagina» la conserva.
export function toTicketListHref(
  basePath: string,
  current: URLSearchParams,
  changes: Record<string, string | null>,
): string {
  const next = new URLSearchParams(current);
  if (!("pagina" in changes)) next.delete("pagina");
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}
