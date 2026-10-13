// src/features/sales-control/components/lines/grid-header.tsx
// Anchos de columna y encabezado fijo de la grilla de líneas.
import { COLUMNS, type ColumnKey } from "./grid-columns";

export function GridHeader({ columns }: { columns: ColumnKey[] }) {
  return (
    <>
      <colgroup>
        {columns.map((key) => (
          <col key={key} style={{ width: COLUMNS[key].width }} />
        ))}
      </colgroup>
      <thead className="sticky top-0 z-10 bg-card">
        <tr className="border-b">
          {columns.map((key) => (
            <th
              key={key}
              scope="col"
              className={`px-2.5 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground ${"align" in COLUMNS[key] ? "text-right" : ""}`}
            >
              {COLUMNS[key].label}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}
