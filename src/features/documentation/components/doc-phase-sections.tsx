// src/features/documentation/components/doc-phase-sections.tsx
// Las fases de un proyecto de documentación, en orden, cada una como carpeta de documentos (AGENTS.md §2.10).
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { DocProjectPhases } from "../types";
import { DocPhaseSection } from "./doc-phase-section";

type Props = { projectId: string; data: DocProjectPhases };

export function DocPhaseSections({ projectId, data }: Props) {
  if (data.phases.length === 0)
    return (
      <KrakenEmpty compact title="Todavía no hay fases de documentación.">
        Pide al administrador del sistema que las cree en Administración → Fases
        de documentación; aparecen aquí como carpetas.
      </KrakenEmpty>
    );
  return (
    <div className="grid gap-4">
      {!data.filesEnabled && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Los documentos no están configurados. Pide al administrador que
          conecte la biblioteca de SharePoint.
        </p>
      )}
      {data.phases.map((phase) => (
        <DocPhaseSection
          key={phase.id}
          projectId={projectId}
          phase={phase}
          canUpload={data.filesEnabled}
        />
      ))}
    </div>
  );
}
