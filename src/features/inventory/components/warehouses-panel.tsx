// src/features/inventory/components/warehouses-panel.tsx
// Catálogo de almacenes: alta en línea, activos y, plegados, los dados de baja.
import { ChevronRight } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { CityOption, WarehouseAdminView } from "../types";
import { NewWarehouse } from "./new-warehouse";
import { WarehouseRow } from "./warehouse-row";

type Props = { warehouses: WarehouseAdminView[]; cities: CityOption[] };

export function WarehousesPanel({ warehouses, cities }: Props) {
  const active = warehouses.filter((w) => w.isActive);
  const inactive = warehouses.filter((w) => !w.isActive);
  return (
    <div className="grid gap-4">
      <NewWarehouse cities={cities} />
      {active.length === 0 ? (
        <KrakenEmpty compact title="No hay almacenes activos.">
          Corre db:seed:base para crear los de cada ciudad, o agrega uno con el
          formulario de arriba.
        </KrakenEmpty>
      ) : (
        <ul className="kr-surface divide-y divide-border/60 rounded-xl">
          {active.map((w) => (
            <WarehouseRow key={w.id} warehouse={w} cities={cities} />
          ))}
        </ul>
      )}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Dados de baja
            <span className="tabular-nums">({inactive.length})</span>
          </summary>
          <ul className="kr-surface mt-3 divide-y divide-border/60 rounded-xl">
            {inactive.map((w) => (
              <WarehouseRow key={w.id} warehouse={w} cities={cities} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
