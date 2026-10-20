// src/features/sales-control/components/lines/cv-lines-editor.tsx
// Editor de líneas del CV: barra de acciones, grilla, panel de totales, pegar desde Excel, factores y guardado.
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { submitCvVersion } from "../../actions/submit-cv-version";
import { upsertCvLines } from "../../actions/upsert-cv-lines";
import { approverLabels } from "../../approver-labels";
import type { CvGridOptions } from "../../types";
import { CvLineGrid } from "./cv-line-grid";
import { CvLinesToolbar } from "./cv-lines-toolbar";
import { CvTotalsPanel } from "./cv-totals-panel";
import { visibleColumns } from "./grid-columns";
import { LineDetailSheet } from "./line-detail-sheet";
import { LinesNotice, type LinesNoticeValue } from "./lines-notice";
import {
  type LinesState,
  orderBySection,
  useCvLinesState,
} from "./use-cv-lines-state";
import { useLinesCommands } from "./use-lines-commands";
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
  isOpeningBalance: boolean;
};

export function CvLinesEditor({
  versionId,
  initial,
  options,
  fxRates,
  thresholdUsd,
  canEdit,
  canSeeCosts,
  isOpeningBalance,
}: Props) {
  const router = useRouter();
  const [state, dispatch] = useCvLinesState(initial);
  const [baseline] = useState(() => JSON.stringify(state));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<LinesNoticeValue>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const detailContext = useMemo(
    () => ({
      hoursUnitIds: new Set(
        options.units.filter((u) => u.isHours).map((u) => u.id),
      ),
      isOpeningBalance,
    }),
    [options.units, isOpeningBalance],
  );
  const columns = visibleColumns(canSeeCosts);
  const { results, summary, details } = useLinesPricing(
    state.lines,
    fxRates,
    canSeeCosts,
    detailContext,
  );
  const approvers = approverLabels(summary, options.areas, thresholdUsd);
  const detailLine = state.lines.find((line) => line.key === detailKey) ?? null;
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
            approverLabels={approvers}
            onSubmit={() => submitCvVersion({ versionId })}
            onSubmitted={() => router.refresh()}
            onApplyTechnologyFactor={commands.applyTechnologyFactor}
          />
        ) : (
          <h2 className="text-base font-semibold">Líneas</h2>
        )}
        {isOpeningBalance && (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            CV de saldo inicial: solo líneas de horas de servicio, con costo y
            venta en 0. Cada línea abre su bolsa al aprobarse.
          </p>
        )}
        {canEdit && <LinesNotice notice={notice} isDirty={isDirty} />}
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
            dispatch={dispatch}
            details={details}
            onOpenDetail={setDetailKey}
            onPasteBlock={commands.pasteBlock}
            onApplyGroupFactor={commands.applyGroupFactor}
          />
        )}
      </div>
      <LineDetailSheet
        line={detailLine}
        row={detailLine ? state.lines.indexOf(detailLine) : 0}
        needsHourBag={
          detailLine
            ? (details.get(detailLine.key)?.needsHourBag ?? false)
            : false
        }
        issues={detailLine ? (details.get(detailLine.key)?.issues ?? []) : []}
        areas={options.areas}
        projects={options.projects}
        canEdit={canEdit}
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
      />
    </section>
  );
}
