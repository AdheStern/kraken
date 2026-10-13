// src/features/sales-control/components/lines/cv-lines-editor.tsx
// Editor de líneas del CV: barra de acciones, grilla, panel de totales, pegar desde Excel, factores y guardado.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertCvLines } from "../../actions/upsert-cv-lines";
import { applyFactorToDrafts } from "../../apply-factor-to-drafts";
import { pasteIntoLines } from "../../paste-into-lines";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { CvLineGrid } from "./cv-line-grid";
import { CvLinesToolbar } from "./cv-lines-toolbar";
import { CvTotalsPanel } from "./cv-totals-panel";
import { type ColumnKey, visibleColumns } from "./grid-columns";
import {
  blankLine,
  type LinesState,
  orderBySection,
  useCvLinesState,
} from "./use-cv-lines-state";
import { useLinesPricing } from "./use-lines-pricing";
import { useSaveShortcuts } from "./use-save-shortcuts";

type Props = {
  versionId: string;
  initial: LinesState;
  options: CvGridOptions;
  fxRates: { costFxRate: string; saleFxRate: string };
  thresholdUsd: string;
  canEdit: boolean;
  canSeeCosts: boolean;
};

type Notice = { tone: "info" | "error"; text: string } | null;

export function CvLinesEditor({
  versionId,
  initial,
  options,
  fxRates,
  thresholdUsd,
  canEdit,
  canSeeCosts,
}: Props) {
  const router = useRouter();
  const [state, dispatch] = useCvLinesState(initial);
  const [baseline] = useState(() => JSON.stringify(state));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const columns = visibleColumns(canSeeCosts);
  const { results, summary } = useLinesPricing(
    state.lines,
    fxRates,
    canSeeCosts,
  );
  const isDirty = JSON.stringify(state) !== baseline;

  async function save() {
    if (!canEdit || isSaving || !isDirty) return;
    setIsSaving(true);
    setNotice(null);
    const result = await upsertCvLines({
      versionId,
      groups: state.groups,
      lines: orderBySection(state),
    });
    setIsSaving(false);
    if (!result.ok)
      return setNotice({ tone: "error", text: result.error.message });
    router.refresh();
  }
  useSaveShortcuts(() => void save(), isDirty);

  function pasteBlock(
    target: { lineKey: string; column: ColumnKey },
    matrix: string[][],
  ) {
    const result = pasteIntoLines(
      state,
      matrix,
      target,
      columns,
      options,
      (groupKey) => blankLine("ITEM", groupKey),
    );
    dispatch({ type: "setLines", lines: result.lines });
    const unknown =
      result.unmatched.length > 0
        ? ` No se reconoció: ${result.unmatched.slice(0, 4).join(", ")}.`
        : "";
    setNotice({
      tone: unknown ? "error" : "info",
      text: `Se pegaron ${result.touched} filas.${unknown}`,
    });
  }

  function applyFactor(
    factor: string,
    shouldApply: (line: CvLineDraft) => boolean,
    scope: string,
  ) {
    const result = applyFactorToDrafts(state.lines, factor, shouldApply);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    dispatch({ type: "setLines", lines: result.lines });
    const skipped =
      result.skipped > 0
        ? ` ${result.skipped} sin costo o incompletas quedaron igual.`
        : "";
    setNotice({
      tone: "info",
      text: `Factor aplicado a ${result.applied} líneas de ${scope}.${skipped}`,
    });
  }

  return (
    <section
      className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_288px]"
      aria-label="Líneas del CV"
    >
      <div className="grid min-w-0 content-start gap-3">
        {canEdit ? (
          <CvLinesToolbar
            technologies={options.technologies}
            isDirty={isDirty}
            isSaving={isSaving}
            onAddLine={() =>
              dispatch({ type: "addLine", groupKey: null, kind: "ITEM" })
            }
            onAddNote={() =>
              dispatch({ type: "addLine", groupKey: null, kind: "NOTA" })
            }
            onAddGroup={() => dispatch({ type: "addGroup" })}
            onSave={() => void save()}
            onApplyTechnologyFactor={(technologyId, factor) => {
              const label =
                options.technologies.find((t) => t.id === technologyId)
                  ?.label ?? "la tecnología";
              applyFactor(
                factor,
                (line) => line.technologyId === technologyId,
                label,
              );
            }}
          />
        ) : (
          <h2 className="text-base font-semibold">Líneas</h2>
        )}
        <p aria-live="polite" className="min-h-5 text-sm">
          {notice ? (
            <span
              className={
                notice.tone === "error" ? "text-destructive" : "text-success"
              }
            >
              {notice.text}
            </span>
          ) : isDirty ? (
            <span className="text-muted-foreground">
              Cambios sin guardar · Ctrl+S para guardar. Pega bloques desde
              Excel en cualquier celda.
            </span>
          ) : null}
        </p>
        {state.lines.length === 0 && state.groups.length === 0 ? (
          <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            {canEdit
              ? "Este CV todavía no tiene líneas. Agrega una línea y pega desde Excel, o agrega una nota o un lote."
              : "Este CV no tiene líneas."}
          </p>
        ) : (
          <CvLineGrid
            state={state}
            results={results}
            columns={columns}
            options={options}
            canEdit={canEdit}
            dispatch={dispatch}
            onPasteBlock={pasteBlock}
            onApplyGroupFactor={(groupKey, factor) => {
              const name =
                state.groups.find((g) => g.key === groupKey)?.name ?? "el lote";
              applyFactor(factor, (line) => line.groupKey === groupKey, name);
            }}
          />
        )}
      </div>
      <CvTotalsPanel
        summary={summary}
        areas={options.areas}
        thresholdUsd={thresholdUsd}
        canSeeCosts={canSeeCosts}
      />
    </section>
  );
}
