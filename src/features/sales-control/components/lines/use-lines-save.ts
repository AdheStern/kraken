// src/features/sales-control/components/lines/use-lines-save.ts
// Guardado del editor de líneas: el borrador completo (sin las líneas nuevas que quedaron vacías) o, fuera del
// borrador, los datos posventa de la versión aprobada y GROSS UP y RET DIMA (AGENTS.md §2.3).
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ActionResult, actionOk } from "@/lib/action-result";
import { updateCvWithholdings } from "../../actions/update-cv-withholdings";
import { updatePostSaleDetails } from "../../actions/update-post-sale-details";
import { upsertCvLines } from "../../actions/upsert-cv-lines";
import type { LineEditRights } from "./item-cell-context";
import type { LinesNoticeValue } from "./lines-notice";
import {
  isBlankLine,
  type LinesState,
  orderBySection,
} from "./use-cv-lines-state";

export function useLinesSave(
  versionId: string,
  state: LinesState,
  canEdit: boolean,
  rights: LineEditRights,
  isDirty: boolean,
) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<LinesNoticeValue>(null);
  const canSave =
    canEdit || rights.canEditPostSale || rights.canEditWithholdings;

  async function save() {
    if (!canSave || isSaving || !isDirty) return;
    setIsSaving(true);
    setNotice(null);
    const result = canEdit
      ? await upsertCvLines({
          versionId,
          groups: state.groups,
          lines: orderBySection(state).filter((line) => !isBlankLine(line)),
        })
      : await saveAfterDraft(versionId, state, rights);
    setIsSaving(false);
    if (!result.ok)
      return setNotice({ tone: "error", text: result.error.message });
    router.refresh();
  }

  return { save, isSaving, notice, setNotice };
}

async function saveAfterDraft(
  versionId: string,
  state: LinesState,
  rights: LineEditRights,
): Promise<ActionResult<unknown>> {
  const items = state.lines.flatMap((line) =>
    line.kind === "ITEM" && line.id ? [{ ...line, id: line.id }] : [],
  );
  if (rights.canEditPostSale) {
    const result = await updatePostSaleDetails({
      versionId,
      lines: items.map((line) => ({
        id: line.id,
        notes: line.notes,
        poNumber: line.poNumber,
        bc: line.bc,
        serials: line.serials,
        activationStart: line.activationStart,
        activationEnd: line.activationEnd,
      })),
    });
    if (!result.ok) return result;
  }
  if (!rights.canEditWithholdings) return actionOk(null);
  return updateCvWithholdings({
    versionId,
    lines: items.map(({ id, grossUpUsd, retDimaUsd }) => ({
      id,
      grossUpUsd,
      retDimaUsd,
    })),
  });
}
