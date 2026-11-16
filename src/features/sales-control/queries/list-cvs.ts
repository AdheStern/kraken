// src/features/sales-control/queries/list-cvs.ts
// Los CV más recientes visibles para el usuario (hasta 100), para resúmenes como el Inicio; el listado
// paginado y ordenable es listCvPage (AGENTS.md §2.9, regla 7).
import type { SessionUser } from "@/server/authz/roles";
import type { CvListRow } from "../types";
import { type CvListFilters, cvListWhere } from "./cv-list-where";
import { loadCvListRows } from "./load-cv-list-rows";

export type { CvListFilters } from "./cv-list-where";

const LIMIT = 100;

// LIMITACIÓN: no filtra por área (el Inicio no lo usa); el estado es el de la última versión.
export async function listCvs(
  user: SessionUser,
  filters: Omit<CvListFilters, "areaId">,
): Promise<CvListRow[]> {
  const rows = await loadCvListRows(user, {
    where: cvListWhere(user, filters),
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });
  return filters.status
    ? rows.filter((row) => row.status === filters.status)
    : rows;
}
