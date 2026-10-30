// src/features/sales-control/components/lines/row-color-picker.tsx
// Color de relleno de una fila del CV: la paleta de Excel (tema con sus variaciones y estándar), sin color o
// uno libre. Se guarda con la línea y se exporta como relleno de la fila (AGENTS.md §2.1).
"use client";

import { Ban, PaintBucket } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STANDARD_COLORS, THEME_COLUMNS } from "./excel-palette";

type Props = {
  value: string | null;
  onChange: (color: string | null) => void;
};

const TRIGGER =
  "relative flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

export function RowColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const choose = (color: string | null) => {
    onChange(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={TRIGGER}
        aria-label="Color de la fila"
        title="Color de la fila"
      >
        <PaintBucket className="size-3.5" aria-hidden="true" />
        {value && (
          <span
            className="absolute right-1 bottom-1 size-2 rounded-full ring-1 ring-border"
            style={{ backgroundColor: `#${value}` }}
          />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-2 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Colores del tema
        </p>
        <div className="grid grid-flow-col grid-cols-10 grid-rows-6 gap-x-1 gap-y-0.5">
          {THEME_COLUMNS.flatMap((column) =>
            column.shades.map((hex, shade) => (
              <Swatch
                key={`${column.name}-${hex}-${shade}`}
                hex={hex}
                label={`${column.name}${column.labels[shade] ? `, ${column.labels[shade]}` : ""}`}
                selected={value === hex}
                className={shade === 0 ? "mb-1" : undefined}
                onPick={choose}
              />
            )),
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Colores estándar
        </p>
        <div className="grid grid-cols-10 gap-1">
          {STANDARD_COLORS.map((c) => (
            <Swatch
              key={c.hex}
              hex={c.hex}
              label={c.name}
              selected={value === c.hex}
              onPick={choose}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-muted"
            onClick={() => choose(null)}
          >
            <Ban className="size-3.5" aria-hidden="true" />
            Sin color
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
            Más colores
            <input
              type="color"
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
              value={`#${value ?? "FFFFFF"}`}
              onChange={(event) =>
                onChange(event.target.value.slice(1).toUpperCase())
              }
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type SwatchProps = {
  hex: string;
  label: string;
  selected: boolean;
  className?: string;
  onPick: (hex: string) => void;
};

function Swatch({ hex, label, selected, className, onPick }: SwatchProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={() => onPick(hex)}
      className={`size-4.5 rounded-[3px] ring-1 ring-black/15 outline-none hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-foreground ${className ?? ""}`}
      style={{ backgroundColor: `#${hex}` }}
    />
  );
}
