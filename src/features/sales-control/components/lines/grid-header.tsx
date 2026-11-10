// src/features/sales-control/components/lines/grid-header.tsx
// Anchos de columna y encabezado fijo de la grilla de líneas. En una columna desplegable, el encabezado abre
// «Aplicar a todas» cuando se puede editar.
import { ChevronDown } from "lucide-react";
import type { CvGridOptions } from "../../types";
import { ColumnFillPopover } from "./column-fill-popover";
import { COLUMNS, type ColumnKey } from "./grid-columns";
import { isSelectColumn, type SelectColumnKey } from "./select-columns";

export type GridFill = {
  options: CvGridOptions;
  onFill: (column: SelectColumnKey, value: string, onlyEmpty: boolean) => void;
};

const TRIGGER =
  "-mx-1 inline-flex items-center gap-0.5 rounded px-1 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

export function GridHeader({
  columns,
  fill,
}: {
  columns: ColumnKey[];
  fill?: GridFill;
}) {
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
              {fill && isSelectColumn(key) ? (
                <ColumnFillPopover
                  columns={[key]}
                  options={fill.options}
                  scopeLabel="todas las líneas"
                  ariaLabel={`${COLUMNS[key].label}: aplicar a todas las líneas`}
                  triggerClassName={TRIGGER}
                  onApply={fill.onFill}
                >
                  {COLUMNS[key].label}
                  <ChevronDown className="size-3" aria-hidden="true" />
                </ColumnFillPopover>
              ) : (
                COLUMNS[key].label
              )}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}
