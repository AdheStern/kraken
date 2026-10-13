// src/features/sales-control/components/versions/version-comparison.tsx
// Comparador de versiones: diferencia de totales y líneas agregadas, quitadas y modificadas (AGENTS.md §2.3).
import type { LineComparison } from "@/domain/sales-control/compare-versions";
import { formatAmount } from "@/lib/format-amount";
import type { CvComparisonData } from "../../types";

const STATUS: Record<
  LineComparison["status"],
  { label: string; className: string }
> = {
  AGREGADA: { label: "Agregada", className: "bg-success/15 text-success" },
  QUITADA: {
    label: "Quitada",
    className: "bg-destructive/10 text-destructive",
  },
  MODIFICADA: { label: "Modificada", className: "bg-warning/15 text-warning" },
  IGUAL: { label: "Sin cambios", className: "bg-muted text-muted-foreground" },
};

export function VersionComparison({
  data,
  showUnchanged,
}: {
  data: CvComparisonData;
  showUnchanged: boolean;
}) {
  const rows = showUnchanged
    ? data.rows
    : data.rows.filter((row) => row.status !== "IGUAL");
  const counts = countByStatus(data.rows);

  return (
    <div className="grid gap-5">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.totals.map((total) => (
          <div
            key={total.label}
            className="rounded-xl border bg-card px-4 py-3"
          >
            <dt className="text-xs text-muted-foreground">{total.label}</dt>
            <dd className="mt-1 tabular-nums">
              <span className="text-muted-foreground">
                {formatAmount(total.before)}
              </span>{" "}
              →{" "}
              <span className="font-semibold">{formatAmount(total.after)}</span>
              <span className={`ml-2 text-sm ${diffTone(total.diff)}`}>
                {total.diff.startsWith("-") ? "" : "+"}
                {formatAmount(total.diff)}
              </span>
            </dd>
          </div>
        ))}
        <div className="rounded-xl border bg-card px-4 py-3 text-sm lg:col-span-2">
          <dt className="text-xs text-muted-foreground">Líneas</dt>
          <dd className="mt-1">
            {counts.AGREGADA} agregadas · {counts.QUITADA} quitadas ·{" "}
            {counts.MODIFICADA} modificadas · {counts.IGUAL} sin cambios
          </dd>
        </div>
      </dl>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Las líneas de {data.fromLabel} y {data.toLabel} son iguales; solo
          cambió la cabecera o el leasing.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((row, index) => (
            <ComparisonRow key={`${row.status}-${index}`} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ComparisonRow({ row }: { row: LineComparison }) {
  const line = row.status === "QUITADA" ? row.before : row.after;
  const status = STATUS[row.status];
  return (
    <li className="grid gap-2 px-5 py-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
        {line.code && (
          <span className="font-mono text-xs text-muted-foreground">
            {line.code}
          </span>
        )}
        <span
          className={
            row.status === "QUITADA" ? "text-muted-foreground line-through" : ""
          }
        >
          {line.description}
        </span>
      </div>
      {row.status === "MODIFICADA" && (
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
          {row.changes.map((change) => (
            <div key={change.field} className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">
                {change.field === "description" ? "Descripción" : change.field}:
              </dt>
              <dd className="tabular-nums">
                <span className="text-muted-foreground line-through">
                  {change.before || "—"}
                </span>{" "}
                → {change.after || "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function diffTone(diff: string): string {
  if (diff.startsWith("-")) return "text-destructive";
  return diff === "0.00" ? "text-muted-foreground" : "text-success";
}

function countByStatus(
  rows: LineComparison[],
): Record<LineComparison["status"], number> {
  const counts = { AGREGADA: 0, QUITADA: 0, MODIFICADA: 0, IGUAL: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}
