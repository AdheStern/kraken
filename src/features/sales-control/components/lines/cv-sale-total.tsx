// src/features/sales-control/components/lines/cv-sale-total.tsx
// Venta total del panel de totales: la calculada por las líneas o, si Administración o el GG la fijaron, el precio
// final con el calculado tachado, su motivo y el aviso si las líneas cambiaron después (§2.3, decisión 2026-11-19).
"use client";

import Decimal from "decimal.js";
import { TriangleAlert } from "lucide-react";
import { resolveFinalPrice } from "@/domain/pricing/resolve-final-price";
import { formatAmount } from "@/lib/format-amount";
import type { CvFinalPriceState } from "../../types";

export type SaleTotalFinalPrice = CvFinalPriceState & {
  versionId: string;
  isDirty: boolean;
};

type Props = {
  computedSaleUsd: Decimal;
  computedSaleBs: Decimal;
  saleFxRate: string;
  finalPrice: SaleTotalFinalPrice;
};

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

const toDecimal = (value: string | null) => (value ? new Decimal(value) : null);

export function CvSaleTotal({
  computedSaleUsd,
  computedSaleBs,
  saleFxRate,
  finalPrice,
}: Props) {
  const { value } = finalPrice;
  const computed = { computedSaleUsd, computedSaleBs };
  const resolved = resolveFinalPrice({
    ...computed,
    saleFxRate: new Decimal(saleFxRate || "0"),
    finalSaleUsd: toDecimal(value?.saleUsd ?? null),
    finalSaleBs: toDecimal(value?.saleBs ?? null),
  });
  const linesChanged =
    value !== null && !computedSaleUsd.equals(new Decimal(value.baseSaleUsd));

  return (
    <div className="grid content-start gap-1">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {resolved.isOverridden ? "Precio final" : "Venta total"}
        {resolved.isOverridden && (
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
            Ajustado
          </span>
        )}
      </p>
      <p className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
        USD {formatAmount(resolved.saleUsd.toFixed(2))}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        Bs {formatAmount(resolved.saleBs.toFixed(2))}
      </p>
      {value && (
        <div className="grid gap-0.5 text-xs text-muted-foreground">
          <p className="tabular-nums">
            Calculado por líneas:{" "}
            <s>
              USD {formatAmount(computedSaleUsd.toFixed(2))} · Bs{" "}
              {formatAmount(computedSaleBs.toFixed(2))}
            </s>
          </p>
          <p title={value.reason}>
            {`${value.byName}, ${value.at ? dateTime.format(new Date(value.at)) : ""}: ${value.reason}`}
          </p>
        </div>
      )}
      {linesChanged && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/12 px-3 py-2 text-xs text-warning">
          <TriangleAlert
            className="mt-px size-3.5 shrink-0"
            aria-hidden="true"
          />
          Las líneas cambiaron desde que se fijó el precio final; revísalo.
        </p>
      )}
    </div>
  );
}
