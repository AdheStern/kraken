// src/features/inventory/components/count-cart.ts
// Lo contado en un conteo físico (AGENTS.md §2.8): qué significa lo escaneado o tocado (un serial, un código del
// almacén o uno que el sistema no tiene) y cómo cambia la lista. Puro, como el carrito del POS.
import type { PosCatalogItem } from "../types";
import type { CountLine } from "./count-lines";

export type CountResult =
  | { ok: true; lines: CountLine[]; message: string }
  | { ok: false; message: string };

// REGLA: primero el serial exacto, luego el código; lo que no está en el almacén entra igual y cuenta como sobrante.
export function addCounted(
  lines: readonly CountLine[],
  catalog: readonly PosCatalogItem[],
  text: string,
): CountResult {
  const value = text.trim().toUpperCase();
  if (!value) return { ok: false, message: "Escanea o escribe un código." };
  const bySerial = catalog.find((i) =>
    i.serials.some((s) => s.toUpperCase() === value),
  );
  const item = bySerial ?? catalog.find((i) => i.code.toUpperCase() === value);
  const code = item?.code ?? value;
  const current = lineFor(lines, code, item);
  const serial = bySerial?.serials.find((s) => s.toUpperCase() === value);
  if (serial && current.serials.includes(serial))
    return { ok: false, message: `El serial ${serial} ya se contó.` };
  const next = serial
    ? { ...current, serials: [...current.serials, serial] }
    : { ...current, quantity: String(Number(current.quantity || 0) + 1) };
  return {
    ok: true,
    lines: upsert(lines, next),
    message: item
      ? `${code} · contado`
      : `${code} · sin stock en este almacén; si existe en el catálogo, cuenta como sobrante`,
  };
}

export function setCountedSerials(
  lines: readonly CountLine[],
  item: PosCatalogItem,
  serials: readonly string[],
): CountLine[] {
  const next = { ...lineFor(lines, item.code, item), serials: [...serials] };
  return serials.length > 0
    ? upsert(lines, next)
    : lines.filter((l) => l.code !== item.code);
}

export function countedOf(line: CountLine | undefined): number {
  if (!line) return 0;
  return line.isSerialized ? line.serials.length : Number(line.quantity) || 0;
}

function lineFor(
  lines: readonly CountLine[],
  code: string,
  item: PosCatalogItem | undefined,
): CountLine {
  return (
    lines.find((l) => l.code === code) ?? {
      code,
      description: item?.description ?? "",
      isSerialized: item?.isSerialized ?? false,
      quantity: "0",
      serials: [],
      inStock: item !== undefined,
      unitCostUsd: "",
    }
  );
}

function upsert(lines: readonly CountLine[], next: CountLine): CountLine[] {
  return lines.some((l) => l.code === next.code)
    ? lines.map((l) => (l.code === next.code ? next : l))
    : [...lines, next];
}
