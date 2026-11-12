// src/features/sales-control/components/lines/use-detail-context.ts
// Contexto para validar los detalles de una línea: qué unidades son horas o plazo y si el CV es de saldo inicial.
"use client";

import { useMemo } from "react";
import type { LineDetailContext } from "../../line-details";
import type { CvGridOptions } from "../../types";

export function useDetailContext(
  units: CvGridOptions["units"],
  isOpeningBalance: boolean,
): LineDetailContext {
  return useMemo(
    () => ({
      hoursUnitIds: new Set(units.filter((u) => u.isHours).map((u) => u.id)),
      termUnitIds: new Set(units.filter((u) => u.isTerm).map((u) => u.id)),
      isOpeningBalance,
    }),
    [units, isOpeningBalance],
  );
}
