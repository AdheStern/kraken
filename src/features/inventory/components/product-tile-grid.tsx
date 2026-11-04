// src/features/inventory/components/product-tile-grid.tsx
// Los productos como mosaicos para tablet: chips por tecnología (las secciones del supermercado), búsqueda por
// código, descripción o serial y la grilla. Muestra un tope para que un catálogo grande no trabe la tablet.
"use client";

import { Search } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTile, type TileItem } from "./product-tile";

const MAX_TILES = 60;
const ALL = "__todas";
const OTHERS = "Otros";

type Props = {
  items: readonly TileItem[];
  picked: (id: string) => number;
  onPick: (item: TileItem, pointerType: string) => void;
  // Mosaico extra al final (p. ej. «Producto nuevo» en el ingreso).
  extra?: ReactNode;
  emptyText: string;
};

export function ProductTileGrid({
  items,
  picked,
  onPick,
  extra,
  emptyText,
}: Props) {
  const [section, setSection] = useState(ALL);
  const [query, setQuery] = useState("");
  const sections = [...new Set(items.map(sectionOf))].sort(bySection);
  const visible = items.filter(
    (i) => (section === ALL || sectionOf(i) === section) && matches(i, query),
  );
  return (
    <div className="grid content-start gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por código, descripción o serial"
          aria-label="Buscar producto"
          className="h-12 pl-9"
        />
      </div>
      {sections.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[ALL, ...sections].map((s) => (
            <Button
              key={s}
              type="button"
              variant={section === s ? "default" : "outline"}
              aria-pressed={section === s}
              className="h-11 shrink-0 rounded-full px-4"
              onClick={() => setSection(s)}
            >
              {s === ALL ? "Todas" : s}
            </Button>
          ))}
        </div>
      )}
      {visible.length === 0 && !extra ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {query ? `Nada coincide con «${query}».` : emptyText}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
          {visible.slice(0, MAX_TILES).map((item) => (
            <li key={item.id}>
              <ProductTile
                item={item}
                picked={picked(item.id)}
                onPick={onPick}
              />
            </li>
          ))}
          {extra && <li>{extra}</li>}
        </ul>
      )}
      {visible.length > MAX_TILES && (
        <p className="text-sm text-muted-foreground">
          Se muestran {MAX_TILES} de {visible.length}. Escribe parte del código
          para encontrar el resto.
        </p>
      )}
    </div>
  );
}

function sectionOf(item: TileItem): string {
  return item.technology ?? OTHERS;
}

function bySection(a: string, b: string): number {
  if (a === OTHERS) return 1;
  if (b === OTHERS) return -1;
  return a.localeCompare(b, "es");
}

function matches(item: TileItem, query: string): boolean {
  const q = query.trim().toUpperCase();
  if (!q) return true;
  return (
    item.code.toUpperCase().includes(q) ||
    item.description.toUpperCase().includes(q) ||
    (item.serials ?? []).some((s) => s.toUpperCase().includes(q))
  );
}
