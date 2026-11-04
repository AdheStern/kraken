// src/features/inventory/components/receipt-products.tsx
// Pestaña «Productos» del ingreso: el catálogo como mosaicos y un mosaico «Producto nuevo»; tocar abre la línea
// para cargar cantidad, costo y seriales (AGENTS.md §2.8).
"use client";

import { Plus } from "lucide-react";
import type { ReceiptDraftRow } from "@/domain/inventory/parse-receipt-rows";
import type { ReceiptProduct } from "../types";
import type { TileItem } from "./product-tile";
import { ProductTileGrid } from "./product-tile-grid";
import { EMPTY_ROW, sameCode } from "./receipt-draft";
import type { ReceiptItemDraft } from "./receipt-item-dialog";

type Props = {
  products: ReceiptProduct[];
  rows: ReceiptDraftRow[];
  onOpen: (draft: ReceiptItemDraft) => void;
};

export function ReceiptProducts({ products, rows, onOpen }: Props) {
  const rowOf = (code: string) => rows.find((r) => sameCode(r, code));
  return (
    <ProductTileGrid
      items={products.map((p) => toTile(p, rowOf(p.code)))}
      picked={(code) => (rowOf(code) ? 1 : 0)}
      onPick={(tile) => {
        const product = products.find((p) => p.code === tile.id);
        if (!product) return;
        onOpen({
          row: rowOf(product.code) ?? {
            ...EMPTY_ROW,
            code: product.code,
            description: product.description,
          },
          isNew: false,
          isSerialized: product.isSerialized,
        });
      }}
      extra={
        <button
          type="button"
          onClick={() =>
            onOpen({ row: EMPTY_ROW, isNew: true, isSerialized: false })
          }
          className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-sm font-medium text-muted-foreground transition-transform duration-120 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:active:scale-[0.97]"
        >
          <Plus className="size-6" aria-hidden="true" />
          Producto nuevo
        </button>
      }
      emptyText="El catálogo no tiene productos activos."
    />
  );
}

function toTile(
  product: ReceiptProduct,
  row: ReceiptDraftRow | undefined,
): TileItem {
  return {
    id: product.code,
    code: product.code,
    description: product.description,
    technology: product.technology,
    isSerialized: product.isSerialized,
    figureLabel: "En el ingreso",
    figure: row?.quantity.trim() || "—",
  };
}
