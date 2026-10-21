// src/features/admin/queries/list-products.ts
// Productos del catálogo con búsqueda por código o descripción, y el filtro de los creados desde un CV o un ingreso que
// esperan revisión (AGENTS.md §2.1, §14 catálogos sucios).
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { ProductRow } from "../types";

const LIMIT = 300;

// REGLA: por revisar = creado desde un CV o desde un ingreso de inventario, y todavía activo (§2.8, §14).
const TO_REVIEW = {
  isActive: true,
  OR: [{ createdFromCv: true }, { createdFromInventory: true }],
};

export type ProductList = { rows: ProductRow[]; toReview: number };

export async function listProducts(
  search: string,
  onlyToReview: boolean,
): Promise<ProductList> {
  const q = search.trim();
  const [rows, toReview] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(onlyToReview ? TO_REVIEW : {}),
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
        createdFromInventory: true,
        isActive: true,
        technology: { select: { name: true } },
        unit: { select: { code: true } },
      },
    }),
    prisma.product.count({ where: TO_REVIEW }),
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
