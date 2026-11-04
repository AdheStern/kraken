// src/features/inventory/queries/list-receipt-products.ts
// Productos activos del catálogo para elegir en el ingreso como mosaicos (AGENTS.md §2.8). El catálogo no tiene
// alcance por usuario (como la grilla del CV); la página ya exige operar inventario (§2.9).
import { prisma } from "@/server/db";
import type { ReceiptProduct } from "../types";

export async function listReceiptProducts(): Promise<ReceiptProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: {
      code: true,
      description: true,
      isSerialized: true,
      technology: { select: { name: true } },
    },
  });
  return products.map((p) => ({
    code: p.code,
    description: p.description,
    technology: p.technology?.name ?? null,
    isSerialized: p.isSerialized,
  }));
}
