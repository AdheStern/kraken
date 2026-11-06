// src/features/dashboards/components/engineers-table.tsx
// Desempeño por ingeniero del periodo: tiempo real, utilización, fuera de horario, tickets, descontado, SLA,
// mediana de resolución, registros tardíos y clientes conformes; se ordena por cualquier columna y cada fila abre su detalle (AGENTS.md
// §6). Sin montos.
import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import {
  type EngineerSort,
  type EngineerSortKey,
  sortEngineerRows,
} from "../engineer-sort";
import type { EngineerRow } from "../types";

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

const COLUMNS: [EngineerSortKey, string][] = [
  ["name", "Ingeniero"],
  ["loggedMinutes", "Registrado"],
  ["utilizationPct", "Utilización"],
  ["outsidePct", "Fuera de horario"],
  ["ownedResolved", "Resueltos"],
  ["participated", "Tickets"],
  ["chargedMinutes", "Descontado"],
  ["slaPct", "SLA"],
  ["medianResolutionMinutes", "Mediana resolución"],
  ["latePct", "Tardíos"],
  ["satisfiedPct", "Conformes"],
];

export function EngineersTable({
  rows,
  query,
  sort,
}: {
  rows: EngineerRow[];
  query: string;
  sort: EngineerSort;
}) {
  if (rows.length === 0)
    return (
      <p className="kr-solid rounded-xl px-4 py-6 text-center text-sm text-muted-foreground">
        No hay ingenieros en tu alcance. Los roles de ingeniero se asignan por
        grupos de Entra en Administración.
      </p>
    );
  const sorted = sortEngineerRows(rows, sort);
  return (
    <div className="kr-solid overflow-x-auto rounded-xl">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            {COLUMNS.map(([key, label], i) => (
              <SortHeader
                key={key}
                label={label}
                column={key}
                sort={sort}
                query={query}
                alignRight={i > 0}
              />
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
              <Cell>{pct(r.satisfiedPct)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// POR QUÉ: un enlace por columna conserva los filtros del tablero; repetir la columna invierte la dirección.
function SortHeader({
  label,
  column,
  sort,
  query,
  alignRight,
}: {
  label: string;
  column: EngineerSortKey;
  sort: EngineerSort;
  query: string;
  alignRight: boolean;
}) {
  const isActive = sort.key === column;
  const dir = isActive && sort.dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams(query);
  params.set("orden", column);
  params.set("dir", dir);
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`px-3 py-2 font-medium ${alignRight ? "text-right" : ""}`}
      aria-sort={
        isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <Link
        href={`/tableros/ingenieros?${params}`}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive && <Icon className="size-3" aria-hidden="true" />}
      </Link>
    </th>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-right">{children}</td>;
}
