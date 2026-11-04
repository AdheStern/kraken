// src/features/inventory/components/pos-cart.test.ts
// Escaneo del POS (AGENTS.md §2.8): serial exacto antes que código, sin mayúsculas; un serializado no entra por
// código y un serial no se repite. Tocar un mosaico suma una unidad; el selector reemplaza los seriales.
import { describe, expect, it } from "vitest";
import type { PosCatalogItem } from "../types";
import { addUnit, applyScan, lineQuantity, setSerials } from "./pos-cart";

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

describe("applyScan", () => {
  it("suma una unidad por código y una unidad por serial", () => {
    const first = applyScan([], catalog, "cab-utp");
    const second = first.ok ? applyScan(first.cart, catalog, "CAB-UTP") : first;
    const third = second.ok ? applyScan(second.cart, catalog, "foc2") : second;
    expect(
      third.ok &&
        third.cart.map((l) => [l.item.code, lineQuantity(l), l.serials]),
    ).toEqual([
      ["CAB-UTP", 2, []],
      ["C9300", 1, ["FOC2"]],
    ]);
  });

  it("explica lo que no puede agregar", () => {
    expect(applyScan([], catalog, "  ")).toMatchObject({ ok: false });
    expect(applyScan([], catalog, "XYZ")).toEqual({
      ok: false,
      message: "No encontramos «XYZ» en este almacén.",
    });
    expect(applyScan([], catalog, "C9300")).toMatchObject({
      ok: false,
      message: expect.stringMatching(/lleva serial/),
    });
    const once = applyScan([], catalog, "FOC1");
    expect(once.ok && applyScan(once.cart, catalog, "FOC1")).toMatchObject({
      ok: false,
      message: "El serial FOC1 ya está en la salida.",
    });
  });
});

describe("addUnit y setSerials", () => {
  const [cable, switch9300] = catalog as [PosCatalogItem, PosCatalogItem];

  it("suma una unidad al tocar un producto sin serial", () => {
    const first = addUnit([], cable);
    const second = first.ok ? addUnit(first.cart, cable) : first;
    expect(second.ok && second.cart.map(lineQuantity)).toEqual([2]);
  });

  it("no suma un serializado: pide elegir sus seriales", () => {
    expect(addUnit([], switch9300)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/lleva serial/),
    });
  });

  it("reemplaza los seriales elegidos y quita la línea si quedan vacíos", () => {
    const picked = setSerials([], switch9300, ["FOC1", "FOC2"]);
    expect(picked.map((l) => l.serials)).toEqual([["FOC1", "FOC2"]]);
    expect(setSerials(picked, switch9300, ["FOC2"])[0]?.serials).toEqual([
      "FOC2",
    ]);
    expect(setSerials(picked, switch9300, [])).toEqual([]);
  });
});
