// src/features/admin/components/parameter-card.tsx
// Un parámetro del sistema: qué decide, su valor actual con su unidad, quién lo cambió y el guardado.
"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setParameter } from "../actions/set-parameter";
import {
  PARAMETER_DEFINITIONS,
  type ParameterKey,
} from "../parameter-definitions";
import type { ParameterView } from "../types";
import { useAdminAction } from "./use-admin-action";

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function ParameterCard({ parameter }: { parameter: ParameterView }) {
  const definition = PARAMETER_DEFINITIONS[parameter.key as ParameterKey];
  const id = useId();
  const { isPending, error, run } = useAdminAction();
  const [value, setValue] = useState(parameter.text);
  const isDirty = value.trim() !== parameter.text;

  return (
    <li className="kr-surface grid gap-3 rounded-xl p-5 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-start">
      <div className="grid gap-1">
        <label htmlFor={id} className="font-medium">
          {definition.label}
        </label>
        <p className="text-sm text-muted-foreground">{definition.help}</p>
        <p className="text-xs text-muted-foreground">
          {parameter.updatedBy && parameter.updatedAt
            ? `Último cambio: ${parameter.updatedBy}, ${dateFormat.format(new Date(parameter.updatedAt))}`
            : "Valor inicial de la instalación (pendiente de confirmar con DIMA)."}
        </p>
      </div>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => setParameter({ key: parameter.key, value }));
        }}
      >
        <div className="flex items-center gap-2">
          <Input
            id={id}
            value={value}
            placeholder={definition.placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 text-right tabular-nums"
          />
          <span className="w-10 shrink-0 text-sm text-muted-foreground">
            {definition.unit}
          </span>
        </div>
        <Button type="submit" size="sm" disabled={isPending || !isDirty}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Guardar
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </li>
  );
}
