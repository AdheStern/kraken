// src/features/sales-control/components/leasing/cv-leasing-editor.tsx
// Sección de leasing o arrendamiento del CV: lista aparte con su total de costo; no afecta la venta (§2.1).
"use client";

import Decimal from "decimal.js";
import { ChevronDown, LoaderCircle, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatAmount } from "@/lib/format-amount";
import { upsertCvLeasing } from "../../actions/upsert-cv-leasing";
import type { CvLeasingLineDraft } from "../../schemas/cv-leasing-schema";
import type { CvGridOptions } from "../../types";
import { handleGridKeyDown } from "../lines/grid-keyboard";
import { CvLeasingRow, leasingLineTotal } from "./cv-leasing-row";

type Props = {
  versionId: string;
  initial: CvLeasingLineDraft[];
  options: CvGridOptions;
  canEdit: boolean;
};

const HEADERS = [
  "Proveedor",
  "Línea",
  "Código",
  "Descripción",
  "Cant.",
  "Costo unit.",
  "Costo total",
  "Notas",
  "PO#",
  "",
];
const blank = (): CvLeasingLineDraft => ({
  key: crypto.randomUUID(),
  id: null,
  supplierId: null,
  technologyId: null,
  code: "",
  description: "",
  quantity: "1",
  unitCostUsd: "",
  notes: "",
  poNumber: "",
});

export function CvLeasingEditor({
  versionId,
  initial,
  options,
  canEdit,
}: Props) {
  const router = useRouter();
  const [lines, setLines] = useState(initial);
  const [isOpen, setIsOpen] = useState(initial.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty = JSON.stringify(lines) !== JSON.stringify(initial);
  const total = lines.reduce(
    (sum, line) => sum.plus(leasingLineTotal(line) ?? 0),
    new Decimal(0),
  );
  const update = (key: string, patch: Partial<CvLeasingLineDraft>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  async function save() {
    setIsSaving(true);
    setError(null);
    const result = await upsertCvLeasing({ versionId, lines });
    setIsSaving(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="kr-surface rounded-xl"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Leasing
        <span className="font-normal text-muted-foreground">
          · {lines.length} {lines.length === 1 ? "línea" : "líneas"} · costo USD{" "}
          {formatAmount(total.toFixed(2))} · no afecta la venta
        </span>
        <ChevronDown
          className="ml-auto size-4 transition-transform data-[open=true]:rotate-180"
          data-open={isOpen}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-3 border-t px-5 py-4">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: delegación del teclado de las celdas hijas. */}
          <div className="overflow-x-auto" onKeyDown={handleGridKeyDown}>
            <table className="w-max min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  {HEADERS.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-2.5 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, row) => (
                  <CvLeasingRow
                    key={line.key}
                    line={line}
                    row={row}
                    options={options}
                    canEdit={canEdit}
                    onChange={(patch) => update(line.key, patch)}
                    onRemove={() =>
                      setLines((c) => c.filter((l) => l.key !== line.key))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLines((c) => [...c, blank()])}
              >
                <Plus aria-hidden="true" />
                Línea de leasing
              </Button>
              <p aria-live="polite" className="mr-auto text-sm">
                {error ? (
                  <span className="text-destructive">{error}</span>
                ) : isDirty ? (
                  <span className="text-muted-foreground">
                    Cambios sin guardar.
                  </span>
                ) : null}
              </p>
              <Button size="sm" onClick={save} disabled={!isDirty || isSaving}>
                {isSaving ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Guardar leasing
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
