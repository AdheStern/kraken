// src/features/sales-control/components/lines/grid-events.test.ts
// Cuándo un pegado en la grilla del CV se reparte en celdas como en Excel y cuándo se pega como texto.
import { describe, expect, it } from "vitest";
import { isBlockPaste } from "./grid-events";

describe("isBlockPaste", () => {
  it("un bloque con tabuladores siempre se reparte", () => {
    expect(isBlockPaste("a\tb", false)).toBe(true);
    expect(isBlockPaste("a\tb", true)).toBe(true);
  });

  it("en una celda de una línea, varias filas se reparten", () => {
    expect(isBlockPaste("uno\ndos", false)).toBe(true);
    expect(isBlockPaste("uno", false)).toBe(false);
  });

  it("en un texto largo, una columna copiada de Excel (termina en salto) se reparte", () => {
    expect(isBlockPaste("Switch 9300\r\nCable UTP\r\n", true)).toBe(true);
    expect(isBlockPaste("Switch 9300\r\n", true)).toBe(true);
  });

  it("en un texto largo, saltos internos de otra fuente son parte del texto", () => {
    expect(isBlockPaste("Primera línea\nSegunda línea", true)).toBe(false);
    expect(isBlockPaste("\n", true)).toBe(false);
  });
});
