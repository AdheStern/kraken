// src/features/admin/components/simple-catalog-panel.tsx
// Catálogo simple completo: alta en línea, registros activos y, plegados, los dados de baja.
import { ChevronRight } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { SimpleCatalogKind } from "../simple-catalogs";
import type { SimpleCatalogItem } from "../types";
import { NewSimpleCatalogItem } from "./new-simple-catalog-item";
import { SimpleCatalogRow } from "./simple-catalog-row";

type Props = { kind: SimpleCatalogKind; items: SimpleCatalogItem[] };

export function SimpleCatalogPanel({ kind, items }: Props) {
  const active = items.filter((i) => i.isActive);
  const inactive = items.filter((i) => !i.isActive);
  return (
    <div className="grid gap-4">
      <NewSimpleCatalogItem kind={kind} />
      {active.length === 0 ? (
        <KrakenEmpty compact title="Este catálogo no tiene registros activos.">
          Agrega el primero con el formulario de arriba; aparece en los
          selectores del CV en cuanto lo guardas.
        </KrakenEmpty>
      ) : (
        <ul className="kr-surface divide-y divide-border/60 rounded-xl">
          {active.map((item) => (
            <SimpleCatalogRow key={item.id} kind={kind} item={item} />
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
            {inactive.map((item) => (
              <SimpleCatalogRow key={item.id} kind={kind} item={item} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
