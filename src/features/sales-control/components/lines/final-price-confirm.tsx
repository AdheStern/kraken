// src/features/sales-control/components/lines/final-price-confirm.tsx
// Segundo paso del precio final: calculado frente a final en USD y Bs, la diferencia en monto y %, resaltada si
// supera el % del parámetro (avisa, no bloquea), y la confirmación explícita (§2.3, decisión 2026-11-19).
"use client";

import Decimal from "decimal.js";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isFinalPriceDeviating,
  resolveFinalPrice,
} from "@/domain/pricing/resolve-final-price";
import { formatAmount } from "@/lib/format-amount";
import type { FinalPriceDraft } from "./final-price-form";

type Props = {
  draft: FinalPriceDraft;
  computed: { computedSaleUsd: Decimal; computedSaleBs: Decimal };
  saleFxRate: string;
  maxDeviationPct: string;
  error: string | null;
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

const amount = (value: Decimal) => formatAmount(value.toFixed(2));
const signed = (value: Decimal) =>
  `${value.isNegative() ? "−" : "+"}${amount(value.abs())}`;

export function FinalPriceConfirm(props: Props) {
  const { draft, computed } = props;
  const isClearing = !draft.usd.trim() && !draft.bs.trim();
  const r = resolveFinalPrice({
    ...computed,
    saleFxRate: new Decimal(props.saleFxRate || "0"),
    finalSaleUsd: draft.usd.trim() ? new Decimal(draft.usd.trim()) : null,
    finalSaleBs: draft.bs.trim() ? new Decimal(draft.bs.trim()) : null,
  });
  const isDeviating = isFinalPriceDeviating(
    r.diffPct,
    new Decimal(props.maxDeviationPct),
  );
  return (
    <div className="grid gap-3">
      {isClearing ? (
        <p className="text-sm">
          {`El CV vuelve a mostrar el total calculado por sus líneas: USD ${amount(computed.computedSaleUsd)} · Bs ${amount(computed.computedSaleBs)}.`}
        </p>
      ) : (
        <dl
          className={`grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 rounded-lg p-3 text-sm tabular-nums ${isDeviating ? "bg-warning/12" : "bg-muted/50"}`}
        >
          <dt />
          <dd className="text-xs text-muted-foreground">USD</dd>
          <dd className="text-xs text-muted-foreground">Bs</dd>
          <dt className="text-muted-foreground">Calculado</dt>
          <dd>{amount(computed.computedSaleUsd)}</dd>
          <dd>{amount(computed.computedSaleBs)}</dd>
          <dt className="font-medium">Precio final</dt>
          <dd className="font-medium">{amount(r.saleUsd)}</dd>
          <dd className="font-medium">{amount(r.saleBs)}</dd>
          <dt className="text-muted-foreground">Diferencia</dt>
          <dd>{signed(r.diffUsd)}</dd>
          <dd>{signed(r.diffBs)}</dd>
        </dl>
      )}
      {!isClearing && r.diffPct && (
        <p
          className={`flex items-start gap-2 text-xs ${isDeviating ? "text-warning" : "text-muted-foreground"}`}
        >
          {isDeviating && (
            <TriangleAlert
              className="mt-px size-3.5 shrink-0"
              aria-hidden="true"
            />
          )}
          {`Diferencia de ${r.diffPct.toFixed(2)} % frente al calculado${isDeviating ? `, más que el ${props.maxDeviationPct} % habitual. Revisa que sea correcto.` : "."}`}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {`Motivo: ${draft.reason.trim()}`}
      </p>
      {props.error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {props.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onBack}>
          Volver
        </Button>
        <Button onClick={props.onConfirm} disabled={props.isPending}>
          {props.isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {isClearing
            ? "Sí, quitar el precio final"
            : "Sí, cambiar el precio final"}
        </Button>
      </div>
    </div>
  );
}
