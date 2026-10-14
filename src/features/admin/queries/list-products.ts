// src/features/admin/queries/list-products.ts
// Productos del catálogo con búsqueda por código o descripción, y el filtro de los creados desde un CV que
// esperan revisión (AGENTS.md §2.1, §14 catálogos sucios).
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { ProductRow } from "../types";

const LIMIT = 300;

export type ProductList = { rows: ProductRow[]; toReview: number };

export async function listProducts(
  search: string,
  onlyToReview: boolean,
): Promise<ProductList> {
  const q = search.trim();
  const [rows, toReview] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(onlyToReview ? { createdFromCv: true, isActive: true } : {}),
        ...(q
          ? {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
      take: LIMIT,
      select: {
        id: true,
        code: true,
        description: true,
        itemType: true,
        isSerialized: true,
        createdFromCv: true,
        isActive: true,
        technology: { select: { name: true } },
        unit: { select: { code: true } },
      },
    }),
    prisma.product.count({ where: { createdFromCv: true, isActive: true } }),
  ]);
  return {
    toReview,
    rows: rows.map(({ technology, unit, ...row }) => ({
      ...row,
      technology: technology?.name ?? null,
      unit: unit?.code ?? null,
    })),
  };
}
