// src/features/sales-control/components/lines/add-lines-button.tsx
// Botón «Línea» de la barra y de cada lote: agrega una línea o, desde su flecha, varias de golpe (5, 10, 30 o las
// que se escriban, hasta 100). Las que queden vacías se descartan al guardar (decisión 2026-11-11).
"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// POR QUÉ: la grilla no está virtualizada; más de 100 filas nuevas de una vez la vuelven lenta.
export const MAX_NEW_LINES = 100;
const PRESETS = [5, 10, 30];

type Props = {
  onAdd: (count: number) => void;
  // En la barra del editor el botón va delineado; en la fila de un lote, discreto.
  variant: "outline" | "ghost";
  scopeLabel: string;
};

export function AddLinesButton({ onAdd, variant, scopeLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("10");
  const size = variant === "outline" ? "sm" : "xs";
  const add = (value: number) => {
    onAdd(Math.min(Math.max(Math.trunc(value), 1), MAX_NEW_LINES));
    setOpen(false);
  };
  const typed = Number(count);
  const isValid = Number.isInteger(typed) && typed >= 1;

  return (
    <div className="flex items-center">
      <Button
        variant={variant}
        size={size}
        className="rounded-r-none"
        onClick={() => onAdd(1)}
      >
        <Plus aria-hidden="true" />
        Línea
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant={variant}
              size={size}
              className="rounded-l-none border-l-0 px-1.5"
              aria-label={`Agregar varias líneas a ${scopeLabel}`}
              title="Agregar varias líneas"
            />
          }
        >
          <ChevronDown aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60">
          <p className="text-xs font-medium text-muted-foreground">
            Agregar varias líneas a {scopeLabel}
          </p>
          <div className="flex gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                size="xs"
                variant="outline"
                onClick={() => add(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (isValid) add(typed);
            }}
          >
            <Input
              aria-label="Cantidad de líneas"
              inputMode="numeric"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="h-7 w-20 text-right tabular-nums md:text-xs"
            />
            <Button type="submit" size="xs" disabled={!isValid}>
              Agregar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Hasta {MAX_NEW_LINES} por vez. Las que dejes vacías no se guardan.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
