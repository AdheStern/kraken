// src/features/inventory/components/count-cart.test.ts
// Conteo físico (AGENTS.md §2.8): el serial cuenta su unidad una sola vez, el código suma una, lo desconocido entra
// como sobrante y el selector de seriales reemplaza lo contado del producto.
import { describe, expect, it } from "vitest";
import type { PosCatalogItem } from "../types";
import { addCounted, countedOf, setCountedSerials } from "./count-cart";

const item = (code: string, serials: string[] = []): PosCatalogItem => ({
  productId: code,
  code,
  description: code,
  isSerialized: serials.length > 0,
  availableQuantity: "5.00",
  serials,
  technology: null,
});

const catalog = [item("CAB-UTP"), item("C9300", ["FOC1", "FOC2"])];

describe("addCounted", () => {
  it("suma por código, cuenta seriales y no repite uno", () => {
    const a = addCounted([], catalog, "cab-utp");
    const b = a.ok ? addCounted(a.lines, catalog, "CAB-UTP") : a;
    const c = b.ok ? addCounted(b.lines, catalog, "foc1") : b;
    expect(c.ok && c.lines.map((l) => [l.code, countedOf(l)])).toEqual([
      ["CAB-UTP", 2],
      ["C9300", 1],
    ]);
    expect(c.ok && addCounted(c.lines, catalog, "FOC1")).toEqual({
      ok: false,
      message: "El serial FOC1 ya se contó.",
    });
  });

  it("agrega lo que el almacén no tiene como sobrante", () => {
    const result = addCounted([], catalog, "nuevo-1");
    expect(result.ok && result.lines[0]).toMatchObject({
      code: "NUEVO-1",
      inStock: false,
      quantity: "1",
    });
  });
});

describe("setCountedSerials", () => {
  it("reemplaza los seriales y quita el producto si quedan vacíos", () => {
    const c9300 = catalog[1] as PosCatalogItem;
    const lines = setCountedSerials([], c9300, ["FOC1", "FOC2"]);
    expect(lines.map(countedOf)).toEqual([2]);
    expect(setCountedSerials(lines, c9300, [])).toEqual([]);
  });
});
