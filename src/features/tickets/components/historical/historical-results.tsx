// src/features/tickets/components/historical/historical-results.tsx
// Resultado de una carga histórica: cada ticket creado con lo que descontó, los omitidos porque su referencia ya
// estaba cargada y los que fallaron con su motivo (sus filas quedan en la grilla para corregirlas).
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import type { HistoricalResult } from "../../actions/import-historical-tickets";

const rowsText = (rows: number[]) =>
  rows.length === 1
    ? `fila ${rows[0] + 1}`
    : `filas ${rows.map((r) => r + 1).join(", ")}`;

export function HistoricalResults({
  results,
}: {
  results: HistoricalResult[];
}) {
  const created = results.filter((r) => r.outcome === "CREADO").length;
  const skipped = results.filter((r) => r.outcome === "OMITIDO").length;
  const failed = results.length - created - skipped;
  return (
    <section
      className="kr-solid flex flex-col gap-2 rounded-xl p-4 text-sm"
      aria-live="polite"
    >
      <h2 className="font-semibold">
        {`Creados: ${created} · ya cargados antes: ${skipped} · con error: ${failed}`}
      </h2>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {results.map((r) => (
          <li key={r.rows.join("-")} className="flex flex-wrap gap-x-2">
            {r.outcome === "ERROR" ? (
              <span className="text-destructive">
                {`${rowsText(r.rows)} (siguen en la grilla): ${r.message}`}
              </span>
            ) : (
              <>
                <Link
                  href={`/tickets/${r.ticketId}`}
                  className="font-medium text-primary hover:underline"
                >
                  #{r.number}
                </Link>
                <span className="text-muted-foreground">
                  {r.outcome === "OMITIDO"
                    ? "ya estaba cargado con esa referencia; no se tocó"
                    : r.chargedMinutes + r.pendingMinutes > 0
                      ? `descontó ${formatMinutes(r.chargedMinutes)}${r.pendingMinutes > 0 ? ` y dejó ${formatMinutes(r.pendingMinutes)} sin bolsa` : ""}`
                      : "creado"}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
