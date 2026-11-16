// src/domain/sales-control/cv-list-order.test.ts
// Orden del listado de CV por columna con desempate por número, y ventana de página acotada.
import { describe, expect, it } from "vitest";
import { type CvSortFacts, sortCvList, toPageWindow } from "./cv-list-order";

function row(id: string, facts: Partial<CvSortFacts>) {
  return {
    id,
    year: 2026,
    number: 1,
    cityCode: "LP",
    title: "",
    customerName: "",
    status: "BORRADOR",
    totalSaleUsd: "0.00",
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    ...facts,
  };
}

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe("sortCvList", () => {
  it("ordena por número: año, correlativo y ciudad", () => {
    const rows = [
      row("a", { year: 2025, number: 132 }),
      row("b", { year: 2026, number: 15, cityCode: "SC" }),
      row("c", { year: 2026, number: 15, cityCode: "LP" }),
      row("d", { year: 2026, number: 208 }),
    ];
    expect(ids(sortCvList(rows, { key: "codigo", direction: "desc" }))).toEqual(
      ["d", "b", "c", "a"],
    );
  });

  it("compara la venta como decimal, no como texto", () => {
    const rows = [
      row("a", { totalSaleUsd: "985.76" }),
      row("b", { totalSaleUsd: "10000.00" }),
      row("c", { totalSaleUsd: "130.80" }),
    ];
    expect(ids(sortCvList(rows, { key: "venta", direction: "asc" }))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("ordena el estado por el ciclo de la versión", () => {
    const rows = [
      row("a", { status: "APROBADA" }),
      row("b", { status: "BORRADOR" }),
      row("c", { status: "EN_APROBACION" }),
    ];
    expect(ids(sortCvList(rows, { key: "estado", direction: "asc" }))).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("ordena texto sin distinguir tildes ni mayúsculas y desempata por número", () => {
    const rows = [
      row("a", { customerName: "Ñandú", number: 1 }),
      row("b", { customerName: "árbol", number: 2 }),
      row("c", { customerName: "Árbol", number: 3 }),
    ];
    expect(ids(sortCvList(rows, { key: "cliente", direction: "asc" }))).toEqual(
      ["b", "c", "a"],
    );
  });
});

describe("toPageWindow", () => {
  it("devuelve la ventana de la página pedida", () => {
    expect(toPageWindow(132, 2, 25)).toEqual({
      page: 2,
      pageCount: 6,
      start: 25,
      end: 50,
    });
  });

  it("acota una página fuera de rango y una lista vacía", () => {
    expect(toPageWindow(30, 9, 25)).toMatchObject({
      page: 2,
      start: 25,
      end: 30,
    });
    expect(toPageWindow(30, -3, 25)).toMatchObject({ page: 1, start: 0 });
    expect(toPageWindow(0, 1, 25)).toEqual({
      page: 1,
      pageCount: 1,
      start: 0,
      end: 0,
    });
  });
});
