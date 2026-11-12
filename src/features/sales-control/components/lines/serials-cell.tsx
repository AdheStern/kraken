// src/features/sales-control/components/lines/serials-cell.tsx
// Celda opcional de seriales de la grilla del CV: uno por renglón (Alt+Enter agrega otro, como en Excel), con un
// contador contra la cantidad de la línea (AGENTS.md §2.1, decisión 2026-11-12).
"use client";

import { useState } from "react";
import { parseSerials } from "../../parse-serials";
import { TextAreaCell } from "./grid-cells";

type Props = {
  row: number;
  col: number;
  serials: string[];
  quantity: string;
  disabled: boolean;
  onChange: (serials: string[]) => void;
};

export function SerialsCell({
  row,
  col,
  serials,
  quantity,
  disabled,
  onChange,
}: Props) {
  // POR QUÉ: el texto se guarda aparte para poder escribir un renglón nuevo (vacío hasta que se teclea el serial);
  // si los seriales cambian por fuera (pegado, panel de detalle) se toma la lista nueva.
  const joined = serials.join("\n");
  const [text, setText] = useState(joined);
  const [seen, setSeen] = useState(joined);
  if (seen !== joined) {
    setSeen(joined);
    if (parseSerials(text).join("\n") !== joined) setText(joined);
  }
  const issue = serialsIssue(serials, quantity);

  return (
    <div className="grid gap-0.5">
      <TextAreaCell
        row={row}
        col={col}
        label="Seriales"
        placeholder="Uno por renglón"
        error={issue ?? undefined}
        disabled={disabled}
        isResizable
        value={text}
        onValueChange={(next) => {
          setText(next);
          onChange(parseSerials(next));
        }}
      />
      {serials.length > 0 && (
        <span
          className={`px-2 text-[11px] tabular-nums ${issue ? "text-destructive" : "text-muted-foreground"}`}
        >
          {serials.length}/{quantity.trim() || "—"} seriales
        </span>
      )}
    </div>
  );
}

// POR QUÉ: aviso en la celda mientras se escribe; la regla que vale al guardar es lineDetailIssues (line-details.ts).
function serialsIssue(serials: string[], quantity: string): string | null {
  if (new Set(serials).size !== serials.length)
    return "Hay seriales repetidos.";
  const amount = Number(quantity.trim());
  if (Number.isFinite(amount) && amount > 0 && serials.length > amount)
    return "Hay más seriales que la cantidad de la línea.";
  return null;
}
