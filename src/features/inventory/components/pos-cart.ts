// src/features/inventory/components/pos-cart.ts
// Carrito del POS (AGENTS.md §2.8): qué significa lo escaneado (un serial o un código del almacén) y cómo cambia
// el carrito. Puro: el lector de códigos actúa como teclado y termina con Enter.
import type { PosCatalogItem } from "../types";

export type CartLine = {
  item: PosCatalogItem;
  quantity: number;
  serials: string[];
};

export type ScanResult =
  | { ok: true; cart: CartLine[]; message: string }
  | { ok: false; message: string };

// REGLA: primero el serial exacto (identifica la unidad), luego el código del producto; sin distinguir mayúsculas.
export function applyScan(
  cart: readonly CartLine[],
  catalog: readonly PosCatalogItem[],
  text: string,
): ScanResult {
  const value = text.trim();
  if (!value) return { ok: false, message: "Escanea o escribe un código." };
  const upper = value.toUpperCase();
  const bySerial = catalog.find((i) =>
    i.serials.some((s) => s.toUpperCase() === upper),
  );
  if (bySerial) {
    const serial = bySerial.serials.find(
      (s) => s.toUpperCase() === upper,
    ) as string;
    const line = cart.find((l) => l.item.productId === bySerial.productId);
    if (line?.serials.includes(serial))
      return {
        ok: false,
        message: `El serial ${serial} ya está en la salida.`,
      };
    return {
      ok: true,
      cart: upsert(cart, bySerial, (l) => ({
        ...l,
        serials: [...l.serials, serial],
      })),
      message: `${bySerial.code} · serial ${serial}`,
    };
  }
  const byCode = catalog.find((i) => i.code.toUpperCase() === upper);
  if (!byCode)
    return { ok: false, message: `No encontramos «${value}» en este almacén.` };
  if (byCode.isSerialized)
    return {
      ok: false,
      message: `${byCode.code} lleva serial: escanea el serial de cada unidad.`,
    };
  return {
    ok: true,
    cart: upsert(cart, byCode, (l) => ({ ...l, quantity: l.quantity + 1 })),
    message: `${byCode.code} · +1`,
  };
}

export function lineQuantity(line: CartLine): number {
  return line.item.isSerialized ? line.serials.length : line.quantity;
}

function upsert(
  cart: readonly CartLine[],
  item: PosCatalogItem,
  change: (line: CartLine) => CartLine,
): CartLine[] {
  const found = cart.find((l) => l.item.productId === item.productId);
  const base = found ?? { item, quantity: 0, serials: [] };
  const next = change(base);
  return found ? cart.map((l) => (l === found ? next : l)) : [...cart, next];
}
