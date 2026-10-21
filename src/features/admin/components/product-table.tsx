// src/features/admin/components/product-table.tsx
// Listado de productos: código y descripción (abren la ficha), tecnología, unidad, tipo y marcas de serial
// y de "por revisar"; los dados de baja, atenuados.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { cn } from "@/lib/utils";
import type { ProductRow } from "../types";
import { ITEM_TYPE_LABELS } from "./product-labels";

type Props = { products: ProductRow[]; search: string; onlyToReview: boolean };

export function ProductTable({ products, search, onlyToReview }: Props) {
  if (products.length === 0)
    return <Empty search={search} onlyToReview={onlyToReview} />;
  return (
    <ul className="kr-surface divide-y divide-border/60 rounded-xl">
      {products.map((p) => (
        <li
          key={p.id}
          className={cn(
            "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)_8rem_5.5rem_10rem_auto]",
            !p.isActive && "text-muted-foreground",
          )}
        >
          <Link
            href={`/admin/productos/${p.id}`}
            className="truncate font-mono text-xs font-medium after:absolute after:inset-0 hover:underline"
          >
            {p.code}
          </Link>
          <span className="col-span-2 row-start-2 truncate sm:col-span-1 sm:row-start-auto">
            {p.description}
          </span>
          <span className="hidden truncate text-muted-foreground sm:block">
            {p.technology ?? "—"}
          </span>
          <span className="hidden text-muted-foreground sm:block">
            {ITEM_TYPE_LABELS[p.itemType]}
          </span>
          <span className="flex justify-end gap-1.5">
            {(p.createdFromCv || p.createdFromInventory) && p.isActive && (
              <Tag tone="warning">Por revisar</Tag>
            )}
            {p.isSerialized && <Tag>Serial</Tag>}
            {!p.isActive && <Tag>De baja</Tag>}
          </span>
          <ChevronRight
            className="hidden size-4 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}

function Tag({ children, tone }: { children: string; tone?: "warning" }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs whitespace-nowrap",
        tone === "warning"
          ? "bg-warning/15 text-warning"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Empty({ search, onlyToReview }: Omit<Props, "products">) {
  if (search)
    return (
      <KrakenEmpty
        compact
        mood="curious"
        title={`Ningún producto coincide con «${search}».`}
      >
        Busca por otra parte del código o de la descripción, o crea el producto.
      </KrakenEmpty>
    );
  if (onlyToReview)
    return (
      <KrakenEmpty compact title="No hay productos por revisar.">
        Cuando un comercial cree un producto desde el editor del CV, aparecerá
        aquí para revisar su código, tecnología y unidad.
      </KrakenEmpty>
    );
  return (
    <KrakenEmpty compact title="Todavía no hay productos.">
      Crea el primero con «Nuevo producto»; también se crean desde la grilla del
      CV.
    </KrakenEmpty>
  );
}
