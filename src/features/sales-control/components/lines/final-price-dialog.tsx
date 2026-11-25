// src/features/sales-control/components/lines/final-price-dialog.tsx
// Diálogo en dos pasos para fijar o quitar el precio final de la versión: montos y motivo, y luego «¿Estás seguro?»
// con la diferencia frente al calculado (§2.3, decisión 2026-11-19).
"use client";

import type Decimal from "decimal.js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setCvFinalPrice } from "../../actions/set-cv-final-price";
import { setCvFinalPriceSchema } from "../../schemas/final-price-schema";
import type { CvFinalPriceView } from "../../types";
import { FinalPriceConfirm } from "./final-price-confirm";
import { FinalPriceForm } from "./final-price-form";
import { useFinalPriceDraft } from "./use-final-price-draft";

type Props = {
  versionId: string;
  current: CvFinalPriceView | null;
  computed: { computedSaleUsd: Decimal; computedSaleBs: Decimal };
  saleFxRate: string;
  maxDeviationPct: string;
  disabledReason: string | null;
};

export function FinalPriceDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const { draft, submitted, bsFollowsUsd, reset, change, setDraft } =
    useFinalPriceDraft(props);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const input = {
    versionId: props.versionId,
    finalSaleUsd: submitted.usd,
    finalSaleBs: submitted.bs,
    reason: submitted.reason,
  };

  function openWith(next: boolean) {
    setOpen(next);
    if (!next) return;
    setStep("form");
    setError(null);
    reset();
  }

  function review(clear: boolean) {
    const next = clear ? { ...submitted, usd: "", bs: "" } : submitted;
    const parsed = setCvFinalPriceSchema.safeParse({
      ...input,
      finalSaleUsd: next.usd,
      finalSaleBs: next.bs,
    });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (!clear && !next.usd.trim() && !next.bs.trim())
      return setError("Escribe el precio final en USD, en Bs o en ambos.");
    if (clear) setDraft(next);
    setError(null);
    setStep("confirm");
  }

  async function confirm() {
    setIsPending(true);
    const result = await setCvFinalPrice(input);
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={openWith}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="mt-1 justify-self-start"
            disabled={props.disabledReason !== null}
            title={props.disabledReason ?? undefined}
          >
            {props.current ? "Cambiar precio final" : "Precio final"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "form"
              ? "Precio final del CV"
              : "¿Estás seguro de que deseas cambiar el precio final?"}
          </DialogTitle>
          <DialogDescription>
            Reemplaza solo el total que se presenta y exporta. Los precios y
            totales de las líneas no cambian.
          </DialogDescription>
        </DialogHeader>
        {step === "form" ? (
          <FinalPriceForm
            draft={draft}
            bsFollowsUsd={bsFollowsUsd}
            saleFxRate={props.saleFxRate}
            canClear={props.current !== null}
            error={error}
            onChange={change}
            onReview={review}
          />
        ) : (
          <FinalPriceConfirm
            draft={submitted}
            computed={props.computed}
            saleFxRate={props.saleFxRate}
            maxDeviationPct={props.maxDeviationPct}
            error={error}
            isPending={isPending}
            onBack={() => setStep("form")}
            onConfirm={() => void confirm()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
