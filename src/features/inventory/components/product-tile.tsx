// src/features/inventory/components/product-tile.tsx
// Mosaico de un producto para tablet, como la tecla de un POS de supermercado: código, descripción, tecnología y
// el dato que importa en la pantalla (disponible, en stock); muestra cuánto ya está en la operación.
"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type TileItem = {
  id: string;
  code: string;
  description: string;
  technology: string | null;
  isSerialized: boolean;
  // Texto de la esquina inferior («disp. 12», «faltan 3»); `isWarning` lo marca sin depender solo del color.
  figure: string;
  figureLabel: string;
  isWarning?: boolean;
  serials?: readonly string[];
};

type Props = {
  item: TileItem;
  picked: number;
  onPick: (item: TileItem, pointerType: string) => void;
};

export function ProductTile({ item, picked, onPick }: Props) {
  const pointerType = useRef("mouse");
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        pointerType.current = e.pointerType;
      }}
      onClick={() => onPick(item, pointerType.current)}
      aria-label={`${item.code}, ${item.description}${picked > 0 ? `, ${picked} agregados` : ""}`}
      className={cn(
        "kr-solid relative flex h-full min-h-36 w-full flex-col gap-1 rounded-xl p-3 text-left transition-transform duration-120 ease-out select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:active:scale-[0.97]",
        picked > 0 && "ring-2 ring-primary",
      )}
    >
      {picked > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums shadow-md"
        >
          {picked}
        </span>
      )}
      <span
        className={cn(
          "truncate font-mono text-sm font-semibold",
          picked > 0 && "pr-9",
        )}
      >
        {item.code}
      </span>
      <span className="line-clamp-2 text-sm leading-snug text-muted-foreground">
        {item.description || "Sin descripción"}
      </span>
      <span className="mt-auto flex items-end justify-between gap-2">
        <span className="grid gap-1 text-xs text-muted-foreground">
          {item.technology && (
            <span className="truncate">{item.technology}</span>
          )}
          {item.isSerialized && (
            <span className="w-fit rounded-md border px-1.5 py-0.5">
              con serial
            </span>
          )}
        </span>
        <span className="grid text-right">
          <span className="text-xs text-muted-foreground">
            {item.figureLabel}
          </span>
          <span
            className={cn(
              "text-xl font-semibold tabular-nums",
              item.isWarning && "text-warning",
            )}
          >
            {item.figure}
          </span>
        </span>
      </span>
    </button>
  );
}
