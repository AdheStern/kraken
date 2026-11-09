// src/lib/parse-typed-date.test.ts
// Fechas y rangos escritos a mano en los selectores de fecha: formatos aceptados y fechas inexistentes.
import { describe, expect, it } from "vitest";
import {
  formatTypedDate,
  parseTypedDate,
  parseTypedRange,
} from "./parse-typed-date";

describe("parseTypedDate", () => {
  it("acepta día primero con barra, guion o punto, y año de 2 o 4 dígitos", () => {
    expect(parseTypedDate("09/11/2026")).toBe("2026-11-09");
    expect(parseTypedDate("9/11/26")).toBe("2026-11-09");
    expect(parseTypedDate("9-11-2026")).toBe("2026-11-09");
    expect(parseTypedDate(" 9.1.2027 ")).toBe("2027-01-09");
  });

  it("acepta 8 dígitos seguidos y el formato ISO", () => {
    expect(parseTypedDate("09112026")).toBe("2026-11-09");
    expect(parseTypedDate("2026-11-09")).toBe("2026-11-09");
  });

  it("rechaza fechas que no existen y textos que no son fechas", () => {
    expect(parseTypedDate("29/02/2028")).toBe("2028-02-29");
    expect(parseTypedDate("29/02/2026")).toBeNull();
    expect(parseTypedDate("31/04/2026")).toBeNull();
    expect(parseTypedDate("13/13/2026")).toBeNull();
    expect(parseTypedDate("")).toBeNull();
    expect(parseTypedDate("mañana")).toBeNull();
    expect(parseTypedDate("9/11")).toBeNull();
  });
});

describe("parseTypedRange", () => {
  it("lee dos fechas con cualquier separador entre ellas", () => {
    const range = { start: "2026-11-09", end: "2026-12-31" };
    expect(parseTypedRange("09/11/2026 – 31/12/2026")).toEqual(range);
    expect(parseTypedRange("9/11/26 a 31/12/26")).toEqual(range);
    expect(parseTypedRange("09-11-2026 - 31-12-2026")).toEqual(range);
  });

  it("una sola fecha es un rango de un día", () => {
    expect(parseTypedRange("09/11/2026")).toEqual({
      start: "2026-11-09",
      end: "2026-11-09",
    });
  });

  it("rechaza el fin antes del inicio, fechas inválidas y el texto vacío", () => {
    expect(parseTypedRange("31/12/2026 – 09/11/2026")).toBeNull();
    expect(parseTypedRange("31/02/2026 – 09/11/2026")).toBeNull();
    expect(parseTypedRange("")).toBeNull();
  });
});

describe("formatTypedDate", () => {
  it("muestra dd/mm/aaaa y vacío si no hay fecha", () => {
    expect(formatTypedDate("2026-11-09")).toBe("09/11/2026");
    expect(formatTypedDate("")).toBe("");
  });
});
