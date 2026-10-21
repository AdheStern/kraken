// src/features/inventory/components/stock-search.tsx
// Búsqueda del stock de un almacén por código, descripción o serial (?q=), sin JavaScript obligatorio.
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function StockSearch({
  warehouseCode,
  defaultValue,
}: {
  warehouseCode: string;
  defaultValue: string;
}) {
  return (
    <search className="relative w-full max-w-md">
      <form action="/inventario">
        <input type="hidden" name="almacen" value={warehouseCode} />
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Buscar por código, descripción o serial"
          aria-label="Buscar por código, descripción o serial"
          className="h-9 pl-9"
        />
      </form>
    </search>
  );
}
