// src/features/sales-control/components/lines/cv-lines-toolbar.tsx
// Barra del editor de líneas: agregar línea, nota o lote, factor por tecnología, columnas opcionales y guardar.
"use client";

import { Layers, LoaderCircle, Save, Send, StickyNote } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import type { ActionResult } from "@/lib/action-result";
import type { Option } from "../../types";
import { ReasonDialog } from "../versions/reason-dialog";
import { AddLinesButton } from "./add-lines-button";

type Props = {
  technologies: Option[];
  columnsMenu: ReactNode;
  isDirty: boolean;
  isSaving: boolean;
  onAddLine: (count: number) => void;
  onAddNote: () => void;
  onAddGroup: () => void;
  onApplyTechnologyFactor: (technologyId: string, factor: string) => void;
  onSave: () => void;
  approverLabels: string[];
  onSubmit: () => Promise<ActionResult<unknown>>;
  onSubmitted: () => void;
};

export function CvLinesToolbar(props: Props) {
  const [technology, setTechnology] = useState<string | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  // POR QUÉ: el atajo pulsa el mismo botón; deshabilitado (cambios sin guardar) no hace nada.
  useShortcuts({ "cv.submit": () => submitRef.current?.click() });
  return (
    <div data-tour="cv-barra" className="flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-base font-semibold">Líneas</h2>
      <form
        className="flex items-center gap-1 rounded-lg border px-1.5 py-1"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget.elements;
          const factor = (form.namedItem("factor") as HTMLInputElement).value;
          if (technology) props.onApplyTechnologyFactor(technology, factor);
        }}
      >
        <span className="px-1 text-xs text-muted-foreground">
          Factor por tecnología
        </span>
        <OptionSelect
          name="technology"
          aria-label="Tecnología"
          size="sm"
          value={technology}
          options={props.technologies}
          placeholder="Tecnología"
          onValueChange={setTechnology}
          className="h-7 w-32 text-xs"
        />
        <Input
          name="factor"
          inputMode="decimal"
          placeholder="1.35"
          aria-label="Factor"
          className="h-7 w-14 rounded-md px-1.5 text-right text-xs tabular-nums md:text-xs"
        />
        <Button type="submit" size="xs" variant="ghost">
          Aplicar
        </Button>
      </form>
      {props.columnsMenu}
      <AddLinesButton
        variant="outline"
        title="Agregar varias líneas"
        onAdd={props.onAddLine}
      />
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
            ref={submitRef}
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
