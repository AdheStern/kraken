// src/features/sales-control/components/lines/row-parts.tsx
// Piezas comunes de las filas de la grilla: número de ítem (1, 1.1) con estado y acciones (subítem, mover, quitar).
import {
  ArrowDown,
  ArrowUp,
  IndentDecrease,
  IndentIncrease,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

// POR QUÉ: la columna # muestra el número de ítem (el del Excel), no la posición: las notas no llevan número.
export function RowNumber({
  label,
  hasIssues,
  issueText = "La línea tiene datos por completar",
}: {
  label: string | null;
  hasIssues: boolean;
  issueText?: string;
}) {
  const isSub = label?.includes(".") ?? false;
  return (
    <span
      className={`flex items-center gap-1 pr-1 text-xs text-muted-foreground tabular-nums ${isSub ? "justify-start pl-3" : "justify-end"}`}
    >
      {hasIssues && (
        <span
          className="size-1.5 shrink-0 rounded-full bg-destructive"
          title={issueText}
        />
      )}
      {label}
    </span>
  );
}

export function SubItemButton({
  isSubItem,
  onToggle,
}: {
  isSubItem: boolean;
  onToggle: () => void;
}) {
  const label = isSubItem
    ? "Volver a línea principal"
    : "Convertir en subítem de la línea anterior";
  const Icon = isSubItem ? IndentDecrease : IndentIncrease;
  return (
    <button
      type="button"
      className={ICON_BUTTON}
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <Icon className="size-3.5" />
    </button>
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
