// src/features/sales-control/components/lines/use-final-price-draft.ts
// Borrador del precio final: abre con el total vigente (el precio final o, sin él, el calculado) para corregir
// unos centavos sin reescribirlo, y los Bs siguen al USD × TC de venta hasta que se editen (§2.3).
"use client";

import Decimal from "decimal.js";
import { useState } from "react";
import { roundHalfUp2 } from "@/domain/pricing/money";
import type { CvFinalPriceView } from "../../types";
import type { FinalPriceDraft } from "./final-price-form";

type Source = {
  current: CvFinalPriceView | null;
  computed: { computedSaleUsd: Decimal; computedSaleBs: Decimal };
  saleFxRate: string;
};

const AMOUNT = /^\d{1,16}(\.\d{1,2})?$/;
const EMPTY: FinalPriceDraft = { usd: "", bs: "", reason: "" };

export function useFinalPriceDraft(source: Source) {
  const [draft, setDraft] = useState<FinalPriceDraft>(EMPTY);
  const [initial, setInitial] = useState<FinalPriceDraft>(EMPTY);
  const [bsFollowsUsd, setBsFollowsUsd] = useState(true);

  function reset() {
    const { current, computed } = source;
    const usd = current
      ? (current.saleUsd ?? "")
      : computed.computedSaleUsd.toFixed(2);
    const bs = current
      ? (current.saleBs ?? toBs(usd, source.saleFxRate))
      : computed.computedSaleBs.toFixed(2);
    const next = { usd, bs, reason: "" };
    setDraft(next);
    setInitial(next);
    setBsFollowsUsd(current === null || current.saleBs === null);
  }

  function change(next: FinalPriceDraft) {
    if (next.bs !== draft.bs) setBsFollowsUsd(false);
    else if (bsFollowsUsd && next.usd !== draft.usd)
      next = {
        ...next,
        // POR QUÉ: volver al USD de apertura repone sus Bs (sin precio final, la suma de las líneas en Bs,
        // que puede diferir en centavos de USD × TC).
        bs:
          next.usd.trim() === initial.usd
            ? initial.bs
            : toBs(next.usd, source.saleFxRate),
      };
    setDraft(next);
  }

  // POR QUÉ: Bs que solo siguen al USD se envían vacíos para que el servidor los derive del TC, como si no se
  // hubieran escrito; se conservan solo los del calculado que se abrieron sin cambiar el USD.
  const keepsOpeningBs =
    source.current === null && draft.usd.trim() === initial.usd;
  const submitted: FinalPriceDraft =
    bsFollowsUsd && !keepsOpeningBs ? { ...draft, bs: "" } : draft;

  return { draft, submitted, bsFollowsUsd, reset, change, setDraft };
}

function toBs(usd: string, saleFxRate: string): string {
  const value = usd.trim();
  if (!AMOUNT.test(value) || !saleFxRate) return "";
  return roundHalfUp2(new Decimal(value).times(saleFxRate)).toFixed(2);
}
