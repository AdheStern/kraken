// src/domain/sales-control/parse-tsv.test.ts
// Portapapeles de Excel: tabuladores, saltos CRLF, comillas y celdas con saltos de línea.
import { describe, expect, it } from "vitest";
import { parseTsv } from "./parse-tsv";

describe("parseTsv", () => {
  it("separa columnas y filas y quita el salto final", () => {
    expect(parseTsv("C9300\tSwitch\t2\r\nFG-100F\tFirewall\t1\r\n")).toEqual([
      ["C9300", "Switch", "2"],
      ["FG-100F", "Firewall", "1"],
    ]);
  });

  it("respeta celdas entre comillas con saltos de línea y comillas dobles", () => {
    expect(parseTsv('"Línea 1\nLínea 2"\t"Dice ""hola"""\n')).toEqual([
      ["Línea 1\nLínea 2", 'Dice "hola"'],
    ]);
  });

  it("conserva celdas vacías intermedias y recorta espacios", () => {
    expect(parseTsv(" a \t\t c ")).toEqual([["a", "", "c"]]);
  });

  it("una sola celda sin tabuladores", () => {
    expect(parseTsv("985,76")).toEqual([["985,76"]]);
  });

  it("solo espacios y saltos no produce filas", () => {
    expect(parseTsv("\t\r\n\r\n")).toEqual([]);
  });

  it("acepta saltos solo \\r (Excel en Mac)", () => {
    expect(parseTsv("a\tb\rc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});
