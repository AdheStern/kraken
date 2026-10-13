// src/features/sales-control/components/lines/row-parts.tsx
// Piezas comunes de las filas de la grilla: número de fila con estado y acciones (mover, quitar).
import { ArrowDown, ArrowUp, SlidersHorizontal, Trash2 } from "lucide-react";

export function RowNumber({
  row,
  hasIssues,
}: {
  row: number;
  hasIssues: boolean;
}) {
  return (
    <span className="flex items-center justify-end gap-1 pr-1 text-xs text-muted-foreground tabular-nums">
      {hasIssues && (
        <span
          className="size-1.5 rounded-full bg-destructive"
          title="La línea tiene datos por completar"
        />
      )}
      {row + 1}
    </span>
  );
}

const ICON_BUTTON =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

export function RowActions({
  onMove,
  onRemove,
}: {
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-end opacity-60 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
      <button
        type="button"
        className={ICON_BUTTON}
        onClick={() => onMove(-1)}
        aria-label="Subir línea"
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        className={ICON_BUTTON}
        onClick={() => onMove(1)}
        aria-label="Bajar línea"
      >
        <ArrowDown className="size-3.5" />
      </button>
      <button
        type="button"
        className={`${ICON_BUTTON} hover:text-destructive`}
        onClick={onRemove}
        aria-label="Quitar línea"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

type DetailState = "empty" | "filled" | "issues";

const DETAIL_LABEL: Record<DetailState, string> = {
  empty: "Detalle: vigencia, seriales, bolsa de horas",
  filled: "Detalle con datos cargados",
  issues: "El detalle tiene datos por completar",
};

export function DetailButton({
  state,
  onClick,
}: {
  state: DetailState;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${ICON_BUTTON} relative`}
      onClick={onClick}
      aria-label={DETAIL_LABEL[state]}
      title={DETAIL_LABEL[state]}
    >
      <SlidersHorizontal className="size-3.5" />
      {state !== "empty" && (
        <span
          className={`absolute top-1 right-1 size-1.5 rounded-full ${state === "issues" ? "bg-destructive" : "bg-primary"}`}
        />
      )}
    </button>
  );
}
