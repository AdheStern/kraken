// src/features/inventory/components/stock-effects-note.tsx
// Aviso en el borrador de lo que su aprobación reservará del stock de DIMA, de lo que falta (advierte, no
// bloquea) o de por qué no se podrá enviar (AGENTS.md §2.8; los errores dicen qué hacer, §5).
import { Boxes, TriangleAlert } from "lucide-react";
import type { StockEffects } from "../queries/get-version-stock-effects";
import { formatQuantity } from "./inventory-labels";

export function StockEffectsNote({ effects }: { effects: StockEffects }) {
  if (effects.problem)
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>No se podrá enviar: {effects.problem}</span>
      </p>
    );
  if (!effects.warehouseName)
    return (
      <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          La ciudad del CV no tiene almacén físico activo: al aprobarse no se
          reservará stock. Pide al administrador del sistema que lo cree.
        </span>
      </p>
    );
  if (effects.shortages.length > 0)
    return (
      <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium">
            Falta stock en {effects.warehouseName}:
          </span>{" "}
          {effects.shortages
            .map(
              (s) =>
                `«${s.description}» pide ${formatQuantity(s.requested)} y hay ${formatQuantity(s.available)} disponibles (${s.productCode})`,
            )
            .join(" · ")}
          . Al aprobarse se reservará igual y Almacén recibirá el aviso.
        </span>
      </p>
    );
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
      <Boxes className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground">Al aprobarse:</span>{" "}
        reserva{" "}
        {effects.reservedLines === 1
          ? "1 línea"
          : `${effects.reservedLines} líneas`}{" "}
        de stock en {effects.warehouseName}.
      </span>
    </p>
  );
}
