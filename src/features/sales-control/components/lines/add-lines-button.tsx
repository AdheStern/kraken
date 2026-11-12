// src/features/sales-control/components/lines/add-lines-button.tsx
// Botón «Línea» de la barra y de cada lote: agrega una línea o, desde su flecha, varias de golpe (5, 10, 30 o las
// que se escriban, hasta 100). Las que queden vacías se descartan al guardar (decisión 2026-11-11).
"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRef, useState } from "react";
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
const TITLE = "Agregar varias líneas";

type Props = {
  onAdd: (count: number) => void;
  // En la barra del editor el botón va delineado; en la fila de un lote, discreto.
  variant: "outline" | "ghost";
  // Nombre del lote; sin él, las líneas van a la sección sin lote.
  // TRAMPA: va en la etiqueta accesible; en la barra no debe decir «lote», o choca con el botón «Lote».
  groupName?: string;
};

export function AddLinesButton({ onAdd, variant, groupName }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("10");
  const inputRef = useRef<HTMLInputElement>(null);
  const size = variant === "outline" ? "sm" : "xs";
  const label = groupName ? `${TITLE} a ${groupName}` : TITLE;
  const typed = Number(count);
  const isValid = Number.isInteger(typed) && typed >= 1;
  const toAdd = Math.min(typed, MAX_NEW_LINES);
  const add = (value: number) => {
    onAdd(Math.min(value, MAX_NEW_LINES));
    setOpen(false);
  };

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
              aria-label={label}
              title={label}
            />
          }
        >
          <ChevronDown aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64" initialFocus={inputRef}>
          <div className="grid gap-0.5">
            <p className="text-sm font-medium">{TITLE}</p>
            {groupName && (
              <p className="truncate text-xs text-muted-foreground">
                En {groupName}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                className="tabular-nums"
                aria-label={`Agregar ${preset} líneas`}
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
              ref={inputRef}
              aria-label="Cantidad de líneas"
              inputMode="numeric"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              className="h-7 w-14 px-2 text-center tabular-nums md:text-[0.8rem]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!isValid}
              className="flex-1 tabular-nums"
            >
              {isValid ? `Agregar ${toAdd} líneas` : "Agregar"}
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
