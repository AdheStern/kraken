// src/features/sales-control/components/lines/cv-lines-editor.tsx
// Editor de líneas del CV: barra de acciones, grilla, panel de totales y guardado (botón o Ctrl+S).
"use client";

import Decimal from "decimal.js";
import { Layers, LoaderCircle, Plus, Save, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { upsertCvLines } from "../../actions/upsert-cv-lines";
import { priceLine, summarizeLines } from "../../line-pricing";
import type { CvGridOptions } from "../../types";
import { CvLineGrid } from "./cv-line-grid";
import { CvTotalsPanel } from "./cv-totals-panel";
import { visibleColumns } from "./grid-columns";
import {
  type LinesState,
  orderBySection,
  useCvLinesState,
} from "./use-cv-lines-state";

type Props = {
  versionId: string;
  initial: LinesState;
  options: CvGridOptions;
  fxRates: { costFxRate: string; saleFxRate: string };
  thresholdUsd: string;
  canEdit: boolean;
  canSeeCosts: boolean;
};

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
  const [error, setError] = useState<string | null>(null);
  const fx = useMemo(
    () => ({
      costFxRate: new Decimal(fxRates.costFxRate),
      saleFxRate: new Decimal(fxRates.saleFxRate),
    }),
    [fxRates],
  );
  // REGLA: sin permiso de costos las líneas llegan sin costo (regla 12); se suman como precio ingresado.
  const lines = useMemo(
    () =>
      canSeeCosts
        ? state.lines
        : state.lines.map((l) => ({
            ...l,
            unitCostUsd: "0",
            pricingSource: "PRECIO" as const,
          })),
    [state.lines, canSeeCosts],
  );
  const results = useMemo(
    () =>
      new Map(
        lines
          .filter((l) => l.kind === "ITEM")
          .map((l) => [l.key, priceLine(l, fx)]),
      ),
    [lines, fx],
  );
  const summary = useMemo(() => summarizeLines(lines, fx), [lines, fx]);
  const isDirty = JSON.stringify(state) !== baseline;

  async function save() {
    if (!canEdit || isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await upsertCvLines({
      versionId,
      groups: state.groups,
      lines: orderBySection(state),
    });
    setIsSaving(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  return (
    <section
      className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_288px]"
      aria-label="Líneas del CV"
    >
      <div className="grid min-w-0 content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base font-semibold">Líneas</h2>
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  dispatch({ type: "addLine", groupKey: null, kind: "ITEM" })
                }
              >
                <Plus aria-hidden="true" />
                Línea
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  dispatch({ type: "addLine", groupKey: null, kind: "NOTA" })
                }
              >
                <StickyNote aria-hidden="true" />
                Nota
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: "addGroup" })}
              >
                <Layers aria-hidden="true" />
                Lote
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={!isDirty || isSaving}
                title="Ctrl+S"
              >
                {isSaving ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {isSaving ? "Guardando…" : "Guardar líneas"}
              </Button>
            </>
          )}
        </div>
        <p aria-live="polite" className="min-h-5 text-sm">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : isDirty ? (
            <span className="text-muted-foreground">
              Cambios sin guardar · Ctrl+S para guardar.
            </span>
          ) : null}
        </p>
        {state.lines.length === 0 && state.groups.length === 0 ? (
          <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            {canEdit
              ? "Este CV todavía no tiene líneas. Agrega una línea, una nota o un lote."
              : "Este CV no tiene líneas."}
          </p>
        ) : (
          <CvLineGrid
            state={state}
            results={results}
            columns={visibleColumns(canSeeCosts)}
            options={options}
            canEdit={canEdit}
            dispatch={dispatch}
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
