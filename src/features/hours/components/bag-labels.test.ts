// src/features/hours/components/bag-labels.test.ts
// Texto de vigencia de una bolsa: un rango solo se parte antes de "al" para no desbordar columnas angostas.
import { describe, expect, it } from "vitest";
import { expiryText } from "./bag-labels";

const NBSP = String.fromCharCode(0xa0);
const glue = (text: string) => text.replaceAll(" ", NBSP);

describe("expiryText", () => {
  it("deja el rango con un solo punto de corte, antes de «al»", () => {
    const text = expiryText({
      startsOn: "2026-10-01",
      expiresOn: "2027-10-01",
      daysToExpiry: 365,
    });
    expect(text.split(" ")).toEqual([
      glue("Del 1 oct de 2026"),
      glue("al 1 oct de 2027"),
    ]);
  });

  it("mantiene junta la fecha de un vencimiento simple", () => {
    const text = expiryText({ expiresOn: "2026-10-01", daysToExpiry: -3 });
    expect(text).toBe(`Venció el ${glue("1 oct de 2026")}`);
  });
});
