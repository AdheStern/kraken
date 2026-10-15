// src/features/sales-control/components/lines/grid-keyboard.ts
// Navegación de planilla dentro de la grilla: Enter y Shift+Enter bajan y suben; en celdas de texto
// también las flechas. Salta las filas que no tienen esa columna (notas).
import type { KeyboardEvent } from "react";

const MAX_SKIP = 50;

export function handleGridKeyDown(event: KeyboardEvent<HTMLElement>) {
  const target = event.target as HTMLElement;
  const cell = target.dataset.cell;
  if (!cell) return;
  const direction = toDirection(event, target);
  if (direction === 0) return;

  const [row, col] = cell.split(":").map(Number);
  const grid = event.currentTarget;
  for (
    let next = row + direction, step = 0;
    next >= 0 && step < MAX_SKIP;
    next += direction, step++
  ) {
    const found = grid.querySelector<HTMLElement>(
      `[data-cell="${next}:${col}"]`,
    );
    if (found) {
      event.preventDefault();
      found.focus();
      if (found instanceof HTMLInputElement) found.select();
      return;
    }
  }
}

// TRAMPA: en un selector las flechas abren y recorren sus opciones; ahí solo Enter mueve de fila.
function toDirection(event: KeyboardEvent, target: HTMLElement): -1 | 0 | 1 {
  if (event.key === "Enter" && !event.ctrlKey && !event.metaKey)
    return event.shiftKey ? -1 : 1;
  if (target.dataset.slot === "select-trigger") return 0;
  if (event.key === "ArrowDown") return 1;
  if (event.key === "ArrowUp") return -1;
  return 0;
}
