// src/features/dashboards/components/engineers-table.tsx
// Desempeño por ingeniero del periodo: tiempo real, utilización, fuera de horario, tickets, descontado, SLA,
// mediana de resolución y registros tardíos; cada fila abre su detalle (AGENTS.md §6). Sin montos.
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import type { EngineerRow } from "../types";

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

const COLUMNS = [
  "Ingeniero",
  "Registrado",
  "Utilización",
  "Fuera de horario",
  "Resueltos",
  "Tickets",
  "Descontado",
  "SLA",
  "Mediana resolución",
  "Tardíos",
];

export function EngineersTable({
  rows,
  query,
}: {
  rows: EngineerRow[];
  query: string;
}) {
  if (rows.length === 0)
    return (
      <p className="kr-solid rounded-xl px-4 py-6 text-center text-sm text-muted-foreground">
        No hay ingenieros en tu alcance. Los roles de ingeniero se asignan por
        grupos de Entra en Administración.
      </p>
    );
  const sorted = [...rows].sort((a, b) => b.loggedMinutes - a.loggedMinutes);
  return (
    <div className="kr-solid overflow-x-auto rounded-xl">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            {COLUMNS.map((c, i) => (
              <th
                key={c}
                className={`px-3 py-2 font-medium ${i > 0 ? "text-right" : ""}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {sorted.map((r) => (
            <tr key={r.userId} className="border-t border-border/60">
              <td className="max-w-56 truncate px-3 py-2">
                <Link
                  href={`/tableros/ingenieros/${r.userId}${query ? `?${query}` : ""}`}
                  className="font-medium text-primary hover:underline"
                >
                  {r.name}
                </Link>
              </td>
              <Cell>{formatMinutes(r.loggedMinutes)}</Cell>
              <Cell>{pct(r.utilizationPct)}</Cell>
              <Cell>{pct(r.outsidePct)}</Cell>
              <Cell>{r.ownedResolved}</Cell>
              <Cell>{r.participated}</Cell>
              <Cell>{formatMinutes(r.chargedMinutes)}</Cell>
              <Cell>{pct(r.slaPct)}</Cell>
              <Cell>
                {r.medianResolutionMinutes === null
                  ? "—"
                  : formatMinutes(Math.round(r.medianResolutionMinutes))}
              </Cell>
              <Cell>{pct(r.latePct)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-right">{children}</td>;
}
