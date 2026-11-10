// src/features/sales-control/components/lines/use-optional-columns.ts
// Columnas opcionales de la grilla del CV (PO#): las marcadas se recuerdan en el navegador y una columna con datos
// en alguna línea se muestra aunque no esté marcada, para no esconder lo cargado.
"use client";

import { useEffect, useState } from "react";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import { type ColumnKey, OPTIONAL_COLUMN_KEYS } from "./grid-columns";

const STORAGE_KEY = "kraken.cv.columnas-opcionales";

export type OptionalColumnState = {
  key: ColumnKey;
  isChecked: boolean;
  hasData: boolean;
};

export function useOptionalColumns(lines: CvLineDraft[]) {
  const [checked, setChecked] = useState<ColumnKey[]>([]);

  // POR QUÉ: se lee después de montar para que el servidor y el navegador rendericen lo mismo; si el
  // almacenamiento falla (ventana privada, bloqueado), las columnas empiezan ocultas.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored))
        setChecked(OPTIONAL_COLUMN_KEYS.filter((key) => stored.includes(key)));
    } catch {}
  }, []);

  function toggle(key: ColumnKey, isOn: boolean) {
    const next = isOn
      ? [...new Set([...checked, key])]
      : checked.filter((k) => k !== key);
    setChecked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  const columns: OptionalColumnState[] = OPTIONAL_COLUMN_KEYS.map((key) => ({
    key,
    isChecked: checked.includes(key),
    hasData: lines.some((line) => hasValue(line, key)),
  }));
  const shown = new Set(
    columns.filter((c) => c.isChecked || c.hasData).map((c) => c.key),
  );
  return { columns, shown, toggle };
}

function hasValue(line: CvLineDraft, key: ColumnKey): boolean {
  const value = (line as Partial<Record<ColumnKey, unknown>>)[key];
  return typeof value === "string" && value.trim() !== "";
}
