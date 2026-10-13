// src/features/sales-control/components/lines/use-lines-pricing.ts
// Precio de cada línea y resumen de la versión en vivo, con las mismas funciones que usa el servidor.
"use client";

import Decimal from "decimal.js";
import { useMemo } from "react";
import { priceLine, summarizeLines } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";

type FxText = { costFxRate: string; saleFxRate: string };

export function useLinesPricing(
  lines: CvLineDraft[],
  fxRates: FxText,
  canSeeCosts: boolean,
) {
  const fx = useMemo(
    () => ({
      costFxRate: new Decimal(fxRates.costFxRate),
      saleFxRate: new Decimal(fxRates.saleFxRate),
    }),
    [fxRates],
  );
  // REGLA: sin permiso de costos las líneas llegan sin costo (regla 12); se suman como precio ingresado.
  const visible = useMemo(
    () =>
      canSeeCosts
        ? lines
        : lines.map((l) => ({
            ...l,
            unitCostUsd: "0",
            pricingSource: "PRECIO" as const,
          })),
    [lines, canSeeCosts],
  );
  const results = useMemo(
    () =>
      new Map(
        visible
          .filter((l) => l.kind === "ITEM")
          .map((l) => [l.key, priceLine(l, fx)]),
      ),
    [visible, fx],
  );
  const summary = useMemo(() => summarizeLines(visible, fx), [visible, fx]);
  return { results, summary };
}
