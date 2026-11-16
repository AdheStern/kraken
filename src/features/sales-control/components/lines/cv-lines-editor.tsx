// src/features/sales-control/components/lines/cv-lines-editor.tsx
// Editor de líneas del CV: barra de acciones, grilla, panel de totales, pegar desde Excel, factores y guardado.
"use client";

import { useState } from "react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { approverLabels } from "../../approver-labels";
import type { CvGridOptions } from "../../types";
import { CvLineGrid } from "./cv-line-grid";
import { CvLinesTopBar } from "./cv-lines-top-bar";
import { CvTotalsPanel } from "./cv-totals-panel";
import { visibleColumns } from "./grid-columns";
import { LineDetailSheet } from "./line-detail-sheet";
import { LinesNotice } from "./lines-notice";
import { OptionalColumnsMenu } from "./optional-columns-menu";
import { optionalTotals } from "./optional-totals";
import { type LinesState, useCvLinesState } from "./use-cv-lines-state";
import { useDetailContext } from "./use-detail-context";
import { useLineShortcuts } from "./use-line-shortcuts";
import { useLinesCommands } from "./use-lines-commands";
import { useLinesPricing } from "./use-lines-pricing";
import { useLinesSave } from "./use-lines-save";
import { useOptionalColumns } from "./use-optional-columns";
import { useSaveShortcuts } from "./use-save-shortcuts";

type Props = {
  versionId: string;
  initial: LinesState;
  options: CvGridOptions;
  fxRates: { costFxRate: string; saleFxRate: string };
  thresholdUsd: string;
  canEdit: boolean;
  canEditPostSale: boolean;
  canEditWithholdings: boolean;
  canSeeCosts: boolean;
  isOpeningBalance: boolean;
};

export function CvLinesEditor({
  versionId,
  initial,
  options,
  fxRates,
  thresholdUsd,
  canEdit,
  canEditPostSale,
  canEditWithholdings,
  canSeeCosts,
  isOpeningBalance,
}: Props) {
  const rights = { canEditPostSale, canEditWithholdings };
  const [state, dispatch] = useCvLinesState(initial);
  const [baseline] = useState(() => JSON.stringify(state));
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const detailContext = useDetailContext(options.units, isOpeningBalance);
  const optional = useOptionalColumns(state.lines);
  const columns = visibleColumns(canSeeCosts, optional.shown);
  const columnsMenu = (
    <OptionalColumnsMenu
      // REGLA: quien no ve costos no ofrece GROSS UP ni RET DIMA (regla 12).
      columns={optional.columns.filter((c) =>
        visibleColumns(canSeeCosts).includes(c.key),
      )}
      onToggle={optional.toggle}
    />
  );
  const { results, summary, details } = useLinesPricing(
    state.lines,
    fxRates,
    canSeeCosts,
    detailContext,
  );
  const approvers = approverLabels(summary, options.areas, thresholdUsd);
  const detailLine = state.lines.find((line) => line.key === detailKey) ?? null;
  const isDirty = JSON.stringify(state) !== baseline;
  const { save, isSaving, notice, setNotice } = useLinesSave(
    versionId,
    state,
    canEdit,
    rights,
    isDirty,
  );
  useSaveShortcuts(() => void save(), isDirty);
  useLineShortcuts(canEdit, dispatch, setDetailKey);

  const commands = useLinesCommands({
    state,
    columns,
    options,
    dispatch,
    setNotice,
  });

  return (
    <section
      className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_288px]"
      aria-label="Líneas del CV"
    >
      <div className="grid min-w-0 content-start gap-3">
        <CvLinesTopBar
          versionId={versionId}
          canEdit={canEdit}
          rights={rights}
          columnsMenu={columnsMenu}
          technologies={options.technologies}
          approverLabels={approvers}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={() => void save()}
          dispatch={dispatch}
          onApplyTechnologyFactor={commands.applyTechnologyFactor}
        />
        {isOpeningBalance && (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            CV de saldo inicial: solo líneas de horas de servicio, con costo y
            venta en 0. Cada línea abre su bolsa al aprobarse.
          </p>
        )}
        {(canEdit || canEditPostSale || canEditWithholdings) && (
          <LinesNotice notice={notice} isDirty={isDirty} canPaste={canEdit} />
        )}
        {state.lines.length === 0 && state.groups.length === 0 ? (
          <KrakenEmpty compact title="Este CV todavía no tiene líneas.">
            {canEdit &&
              "Agrega una línea y pega desde Excel, o agrega una nota o un lote."}
          </KrakenEmpty>
        ) : (
          <CvLineGrid
            state={state}
            results={results}
            columns={columns}
            options={options}
            canEdit={canEdit}
            rights={rights}
            dispatch={dispatch}
            details={details}
            onOpenDetail={setDetailKey}
            onPasteBlock={commands.pasteBlock}
            onApplyGroupFactor={commands.applyGroupFactor}
            fillFor={canEdit ? commands.fillFor : undefined}
          />
        )}
      </div>
      <LineDetailSheet
        line={detailLine}
        row={detailLine ? state.lines.indexOf(detailLine) : 0}
        bagKind={
          detailLine ? (details.get(detailLine.key)?.bagKind ?? null) : null
        }
        canBeContract={
          detailLine
            ? (details.get(detailLine.key)?.canBeContract ?? false)
            : false
        }
        issues={detailLine ? (details.get(detailLine.key)?.issues ?? []) : []}
        areas={options.areas}
        projects={options.projects}
        canEdit={canEdit}
        canEditPostSale={canEditPostSale}
        onChange={(patch) =>
          detailKey && dispatch({ type: "updateLine", key: detailKey, patch })
        }
        onClose={() => setDetailKey(null)}
      />
      <CvTotalsPanel
        summary={summary}
        approvers={canEdit ? approvers : null}
        thresholdUsd={thresholdUsd}
        canSeeCosts={canSeeCosts}
        optionalTotals={optionalTotals(state.lines, optional.shown)}
      />
    </section>
  );
}
