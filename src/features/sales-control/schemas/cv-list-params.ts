// src/features/sales-control/schemas/cv-list-params.ts
// Parámetros del listado de CV en la URL (búsqueda, filtros, orden y página) y cómo construir su enlace;
// un valor inválido vuelve al de defecto en vez de fallar.
import { z } from "zod";
import {
  CV_SORT_KEYS,
  type CvSort,
  DEFAULT_CV_SORT,
} from "@/domain/sales-control/cv-list-order";
import { CvVersionStatus } from "@/generated/prisma/enums";

export const CV_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_CV_PAGE_SIZE = 25;

const text = z.string().trim().min(1).optional().catch(undefined);

const schema = z.object({
  q: text,
  estado: z.enum(CvVersionStatus).optional().catch(undefined),
  ciudad: z.uuid().optional().catch(undefined),
  area: z.uuid().optional().catch(undefined),
  vendedor: text,
  orden: z.enum(CV_SORT_KEYS).catch(DEFAULT_CV_SORT.key),
  dir: z.enum(["asc", "desc"]).catch(DEFAULT_CV_SORT.direction),
  pagina: z.coerce.number().int().min(1).catch(1),
  filas: z.coerce
    .number()
    .refine((n) => (CV_PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_CV_PAGE_SIZE),
});

export type CvListParams = {
  search?: string;
  status?: CvVersionStatus;
  cityId?: string;
  areaId?: string;
  sellerId?: string;
  sort: CvSort;
  page: number;
  pageSize: number;
};

export function parseCvListParams(
  raw: Record<string, string | string[] | undefined>,
): CvListParams {
  const first = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const p = schema.parse(first);
  return {
    search: p.q,
    status: p.estado,
    cityId: p.ciudad,
    areaId: p.area,
    sellerId: p.vendedor,
    sort: { key: p.orden, direction: p.dir },
    page: p.pagina,
    pageSize: p.filas,
  };
}

// Claves de la URL que son filtros (no orden, filas ni página): las que quita «Borrar filtros».
export const CV_LIST_FILTER_KEYS = [
  "q",
  "estado",
  "ciudad",
  "area",
  "vendedor",
] as const;

// POR QUÉ: cambiar un filtro, el orden o las filas vuelve a la página 1; solo «pagina» la conserva.
export function toCvListHref(
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
  return query ? `/cv?${query}` : "/cv";
}
