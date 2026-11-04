// src/features/inventory/components/pos-product-picker.tsx
// Cómo entra un producto a la salida o al traspaso: escaneándolo (lector o cámara) o tocando su mosaico; el que
// lleva serial abre el selector de seriales del almacén (AGENTS.md §2.8).
"use client";

import { useRef, useState } from "react";
import type { PosCatalogItem } from "../types";
import { formatQuantity } from "./inventory-labels";
import {
  addUnit,
  applyScan,
  type CartLine,
  lineQuantity,
  setSerials,
} from "./pos-cart";
import { PosScanner } from "./pos-scanner";
import type { TileItem } from "./product-tile";
import { ProductTileGrid } from "./product-tile-grid";
import { type SerialPick, SerialPickerDialog } from "./serial-picker-dialog";

type Props = {
  catalog: PosCatalogItem[];
  cart: CartLine[];
  onChange: (cart: CartLine[]) => void;
};

export function PosProductPicker({ catalog, cart, onChange }: Props) {
  const scannerRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState<PosCatalogItem | null>(null);
  const lineOf = (productId: string) =>
    cart.find((l) => l.item.productId === productId);
  const tiles = catalog.map(toTile);

  function onScan(text: string) {
    const result = applyScan(cart, catalog, text);
    if (result.ok) onChange(result.cart);
    return result;
  }

  function onPick(tile: TileItem, pointerType: string) {
    const item = catalog.find((i) => i.productId === tile.id);
    if (!item) return;
    if (item.isSerialized) return setPicking(item);
    const result = addUnit(cart, item);
    if (result.ok) onChange(result.cart);
    // TRAMPA: en la tablet, enfocar el campo abre el teclado en pantalla; solo se devuelve con mouse o lápiz.
    if (pointerType !== "touch") scannerRef.current?.focus();
  }

  const pick: SerialPick | null = picking && {
    code: picking.code,
    description: picking.description,
    serials: picking.serials,
    selected: lineOf(picking.productId)?.serials ?? [],
  };
  return (
    <>
      <PosScanner onScan={onScan} inputRef={scannerRef} />
      <ProductTileGrid
        items={tiles}
        picked={(id) => {
          const line = lineOf(id);
          return line ? lineQuantity(line) : 0;
        }}
        onPick={onPick}
        emptyText="Este almacén no tiene stock. Registra un ingreso o recibe un traspaso."
      />
      <SerialPickerDialog
        pick={pick}
        onClose={() => setPicking(null)}
        onConfirm={(serials) => {
          if (picking) onChange(setSerials(cart, picking, serials));
          setPicking(null);
        }}
      />
    </>
  );
}

function toTile(item: PosCatalogItem): TileItem {
  const shortage = item.availableQuantity.startsWith("-");
  return {
    id: item.productId,
    code: item.code,
    description: item.description,
    technology: item.technology,
    isSerialized: item.isSerialized,
    serials: item.serials,
    figureLabel: "Disponible",
    figure: shortage
      ? `faltan ${formatQuantity(item.availableQuantity.slice(1))}`
      : formatQuantity(item.availableQuantity),
    isWarning: shortage || Number(item.availableQuantity) === 0,
  };
}
