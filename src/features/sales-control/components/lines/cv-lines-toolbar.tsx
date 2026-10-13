// src/features/sales-control/components/lines/cv-lines-toolbar.tsx
// Barra del editor de líneas: agregar línea, nota o lote, factor por tecnología y guardar.
"use client";

import {
  Layers,
  LoaderCircle,
  Plus,
  Save,
  Send,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import type { Option } from "../../types";
import { ReasonDialog } from "../versions/reason-dialog";

type Props = {
  technologies: Option[];
  isDirty: boolean;
  isSaving: boolean;
  onAddLine: () => void;
  onAddNote: () => void;
  onAddGroup: () => void;
  onApplyTechnologyFactor: (technologyId: string, factor: string) => void;
  onSave: () => void;
  approverLabels: string[];
  onSubmit: () => Promise<ActionResult<unknown>>;
  onSubmitted: () => void;
};

const FIELD =
  "h-7 rounded-md border bg-background px-1.5 text-xs outline-none focus:border-ring";

export function CvLinesToolbar(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-base font-semibold">Líneas</h2>
      <form
        className="flex items-center gap-1 rounded-lg border px-1.5 py-1"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget.elements;
          const technology = (form.namedItem("technology") as HTMLSelectElement)
            .value;
          const factor = (form.namedItem("factor") as HTMLInputElement).value;
          if (technology) props.onApplyTechnologyFactor(technology, factor);
        }}
      >
        <span className="px-1 text-xs text-muted-foreground">
          Factor por tecnología
        </span>
        <select
          name="technology"
          aria-label="Tecnología"
          className={`${FIELD} max-w-32`}
          defaultValue=""
        >
          <option value="" disabled>
            Tecnología
          </option>
          {props.technologies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          name="factor"
          inputMode="decimal"
          placeholder="1.35"
          aria-label="Factor"
          className={`${FIELD} w-14 text-right tabular-nums`}
        />
        <Button type="submit" size="xs" variant="ghost">
          Aplicar
        </Button>
      </form>
      <Button variant="outline" size="sm" onClick={props.onAddLine}>
        <Plus aria-hidden="true" />
        Línea
      </Button>
      <Button variant="outline" size="sm" onClick={props.onAddNote}>
        <StickyNote aria-hidden="true" />
        Nota
      </Button>
      <Button variant="outline" size="sm" onClick={props.onAddGroup}>
        <Layers aria-hidden="true" />
        Lote
      </Button>
      <Button
        size="sm"
        onClick={props.onSave}
        disabled={!props.isDirty || props.isSaving}
        title="Ctrl+S"
      >
        {props.isSaving ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Save aria-hidden="true" />
        )}
        {props.isSaving ? "Guardando…" : "Guardar líneas"}
      </Button>
      <ReasonDialog
        trigger={
          <Button
            size="sm"
            variant="secondary"
            disabled={props.isDirty || props.isSaving}
            title={
              props.isDirty ? "Guarda los cambios antes de enviar" : undefined
            }
          >
            <Send aria-hidden="true" />
            Enviar a aprobación
          </Button>
        }
        title="Enviar a aprobación"
        description={`Aprobarán en paralelo: ${props.approverLabels.join(", ") || "las áreas de las líneas"}. La versión ya no se podrá editar.`}
        confirmLabel="Enviar"
        required={false}
        onConfirm={props.onSubmit}
        onDone={props.onSubmitted}
      />
    </div>
  );
}
