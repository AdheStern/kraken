// src/features/sales-control/components/lines/use-lines-save.ts
// Guardado del editor de líneas: el borrador completo, o solo los datos posventa de la versión aprobada
// (observaciones, PO#, activación y seriales; AGENTS.md §2.3).
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePostSaleDetails } from "../../actions/update-post-sale-details";
import { upsertCvLines } from "../../actions/upsert-cv-lines";
import type { LinesNoticeValue } from "./lines-notice";
import { type LinesState, orderBySection } from "./use-cv-lines-state";

type Mode = "draft" | "postSale" | "readOnly";

export function useLinesSave(
  versionId: string,
  state: LinesState,
  mode: Mode,
  isDirty: boolean,
) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<LinesNoticeValue>(null);

  async function save() {
    if (mode === "readOnly" || isSaving || !isDirty) return;
    setIsSaving(true);
    setNotice(null);
    const result =
      mode === "draft"
        ? await upsertCvLines({
            versionId,
            groups: state.groups,
            lines: orderBySection(state),
          })
        : await updatePostSaleDetails({
            versionId,
            lines: postSaleLines(state),
          });
    setIsSaving(false);
    if (!result.ok)
      return setNotice({ tone: "error", text: result.error.message });
    router.refresh();
  }

  return { save, isSaving, notice, setNotice };
}

function postSaleLines(state: LinesState) {
  return state.lines.flatMap((line) =>
    line.kind === "ITEM" && line.id
      ? [
          {
            id: line.id,
            notes: line.notes,
            poNumber: line.poNumber,
            serials: line.serials,
            activationStart: line.activationStart,
            activationEnd: line.activationEnd,
          },
        ]
      : [],
  );
}
