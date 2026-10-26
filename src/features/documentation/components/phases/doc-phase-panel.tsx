// src/features/documentation/components/phases/doc-phase-panel.tsx
// Catálogo de fases de documentación: alta en línea, fases activas en su orden y, plegadas, las dadas de baja.
import { ChevronRight } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { DocPhaseItem } from "../../types";
import { DocPhaseRow } from "./doc-phase-row";
import { NewDocPhase } from "./new-doc-phase";

export function DocPhasePanel({ phases }: { phases: DocPhaseItem[] }) {
  const active = phases.filter((p) => p.isActive);
  const inactive = phases.filter((p) => !p.isActive);
  return (
    <div className="grid gap-4">
      <NewDocPhase />
      {active.length === 0 ? (
        <KrakenEmpty compact title="Todavía no hay fases de documentación.">
          Agrega la primera con el formulario de arriba; cada proyecto la
          muestra como una carpeta para subir documentos.
        </KrakenEmpty>
      ) : (
        <ol className="kr-surface divide-y divide-border/60 rounded-xl">
          {active.map((phase, index) => (
            <DocPhaseRow
              key={phase.id}
              phase={phase}
              position={index + 1}
              isLast={index === active.length - 1}
            />
          ))}
        </ol>
      )}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Dadas de baja
            <span className="tabular-nums">({inactive.length})</span>
          </summary>
          <ul className="kr-surface mt-3 divide-y divide-border/60 rounded-xl">
            {inactive.map((phase) => (
              <DocPhaseRow
                key={phase.id}
                phase={phase}
                position={null}
                isLast
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
