// src/features/sales-control/components/lines/use-lines-pricing.ts
// Precio de cada línea, problemas de detalle y resumen de la versión en vivo, con las mismas funciones
// que usa el servidor al guardar.
"use client";

import Decimal from "decimal.js";
import { useMemo } from "react";
import { lineDetailIssues, needsHourBag } from "../../line-details";
import { type LineIssue, priceLine, summarizeLines } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";

type FxText = { costFxRate: string; saleFxRate: string };

export type LineDetailInfo = {
  issues: LineIssue[];
  needsHourBag: boolean;
  state: "empty" | "filled" | "issues";
};

export function useLinesPricing(
  lines: CvLineDraft[],
  fxRates: FxText,
  canSeeCosts: boolean,
  hoursUnitIds: ReadonlySet<string>,
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
  const details = useMemo(() => {
    const context = { hoursUnitIds };
    return new Map<string, LineDetailInfo>(
      lines
        .filter((l) => l.kind === "ITEM")
        .map((line) => {
          const issues = lineDetailIssues(line, context);
          const hasData =
            line.serials.length > 0 ||
            !!line.coverageStart ||
            !!line.coverageEnd ||
            !!line.hourBag ||
            line.saveAsProduct;
          const state =
            issues.length > 0 ? "issues" : hasData ? "filled" : "empty";
          return [
            line.key,
            { issues, needsHourBag: needsHourBag(line, context), state },
          ];
        }),
    );
  }, [lines, hoursUnitIds]);
  return { results, summary, details };
}
