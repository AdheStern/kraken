// src/features/sales-control/queries/list-cv-page.ts
// Una página del listado de CV visibles para el usuario, ordenada por la columna elegida (AGENTS.md §2.9,
// regla 7). Primero filtra y ordena las claves de todos los CV del alcance por su última versión y después
// carga solo las filas de la página.
import { sortCvList, toPageWindow } from "@/domain/sales-control/cv-list-order";
import type { SessionUser } from "@/server/authz/roles";
import { prisma } from "@/server/db";
import type { CvListParams } from "../schemas/cv-list-params";
import type { CvListPage } from "../types";
import { cvListWhere } from "./cv-list-where";
import { loadCvListRows } from "./load-cv-list-rows";

export async function listCvPage(
  user: SessionUser,
  params: CvListParams,
): Promise<CvListPage> {
  const where = cvListWhere(user, params);
  // POR QUÉ: título, estado, venta y fecha son de la última versión y Prisma no ordena por ella; se ordena en
  // memoria sobre columnas livianas (decenas de miles de CV caben de sobra).
  const keys = await prisma.cv.findMany({
    where,
    select: {
      id: true,
      year: true,
      number: true,
      city: { select: { code: true } },
      customer: { select: { name: true } },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: {
          title: true,
          status: true,
          totalSaleUsd: true,
          updatedAt: true,
          lines: params.areaId
            ? {
                where: { kind: "ITEM", areaId: params.areaId },
                take: 1,
                select: { id: true },
              }
            : false,
          sellers: params.sellerId
            ? { where: { userId: params.sellerId }, select: { userId: true } }
            : false,
        },
      },
    },
  });
  // REGLA: estado, área y vendedor se filtran por la última versión del CV (decisión 2026-11-16, AGENTS.md §5).
  const facts = keys.flatMap(({ versions: [latest], ...cv }) =>
    latest &&
    (!params.status || latest.status === params.status) &&
    (!params.areaId || latest.lines.length > 0) &&
    (!params.sellerId || latest.sellers.length > 0)
      ? [
          {
            id: cv.id,
            year: cv.year,
            number: cv.number,
            cityCode: cv.city.code,
            customerName: cv.customer.name,
            title: latest.title,
            status: latest.status,
            totalSaleUsd: latest.totalSaleUsd.toFixed(2),
            updatedAt: latest.updatedAt,
          },
        ]
      : [],
  );
  const sorted = sortCvList(facts, params.sort);
  const window = toPageWindow(sorted.length, params.page, params.pageSize);
  const pageIds = sorted.slice(window.start, window.end).map((f) => f.id);
  const rows = pageIds.length
    ? await loadCvListRows(user, {
        where: { AND: [where, { id: { in: pageIds } }] },
      })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  return {
    rows: pageIds.flatMap((id) => byId.get(id) ?? []),
    total: sorted.length,
    page: window.page,
    pageCount: window.pageCount,
    pageSize: params.pageSize,
    firstIndex: window.start + 1,
    lastIndex: window.end,
  };
}
