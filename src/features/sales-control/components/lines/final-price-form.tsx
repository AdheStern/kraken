// src/features/sales-control/components/lines/final-price-form.tsx
// Primer paso del precio final: USD y/o Bs, con los Bs que saldrían del TC de venta como sugerencia, y el motivo
// obligatorio (§2.3, decisión 2026-11-19).
"use client";

import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { roundHalfUp2 } from "@/domain/pricing/money";
import { formatAmount } from "@/lib/format-amount";

export type FinalPriceDraft = { usd: string; bs: string; reason: string };

type Props = {
  draft: FinalPriceDraft;
  saleFxRate: string;
  canClear: boolean;
  error: string | null;
  onChange: (draft: FinalPriceDraft) => void;
  onReview: (clear: boolean) => void;
};

const AMOUNT = /^\d{1,16}(\.\d{1,2})?$/;

export function FinalPriceForm({
  draft,
  saleFxRate,
  canClear,
  error,
  onChange,
  onReview,
}: Props) {
  const derivedBs =
    AMOUNT.test(draft.usd.trim()) && saleFxRate
      ? roundHalfUp2(new Decimal(draft.usd.trim()).times(saleFxRate))
      : null;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Precio final USD
          <Input
            inputMode="decimal"
            value={draft.usd}
            placeholder="12500.00"
            onChange={(e) => onChange({ ...draft, usd: e.target.value })}
          />
        </Label>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Precio final Bs
          <Input
            inputMode="decimal"
            value={draft.bs}
            placeholder={
              derivedBs ? derivedBs.toFixed(2) : "Del TC de venta si lo dejas"
            }
            onChange={(e) => onChange({ ...draft, bs: e.target.value })}
          />
        </Label>
      </div>
      {derivedBs && !draft.bs.trim() && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {`Sin Bs se usa USD × TC de venta (${saleFxRate}) = Bs ${formatAmount(derivedBs.toFixed(2))}.`}
        </p>
      )}
      <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
        Motivo
        <Textarea
          rows={2}
          value={draft.reason}
          placeholder="Redondeo acordado con el cliente"
          onChange={(e) => onChange({ ...draft, reason: e.target.value })}
        />
      </Label>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {canClear && (
          <Button variant="ghost" onClick={() => onReview(true)}>
            Quitar precio final
          </Button>
        )}
        <Button onClick={() => onReview(false)}>Revisar</Button>
      </div>
    </div>
  );
}
