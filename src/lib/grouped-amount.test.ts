// src/lib/grouped-amount.test.ts
// Separador de miles mientras se escribe un monto.
import { describe, expect, it } from "vitest";
import { groupAmount, readTypedAmount } from "./grouped-amount";

const type = (text: string, caret = text.length, data: string | null = null) =>
  readTypedAmount({ text, caret, data, isPaste: false });

describe("groupAmount", () => {
  it.each([
    ["", ""],
    ["5", "5"],
    ["1234", "1,234"],
    ["1234567.89", "1,234,567.89"],
    ["12500.", "12,500."],
    ["-1234.5", "-1,234.5"],
    ["abc", "abc"],
  ])("%s → %s", (raw, shown) => {
    expect(groupAmount(raw)).toBe(shown);
  });
});

describe("readTypedAmount", () => {
  it("quita las comas que agrupan y deja el cursor tras el mismo dígito", () => {
    expect(type("1,2345")).toEqual({ raw: "12345", caret: 6 });
    expect(type("12,3456", 3)).toEqual({ raw: "123456", caret: 2 });
  });

  it("borrar un dígito reagrupa", () => {
    expect(type("1,23")).toEqual({ raw: "123", caret: 3 });
  });

  it("una coma tecleada sin punto es el decimal", () => {
    expect(type("1,234,", 6, ",")).toEqual({ raw: "1234.", caret: 6 });
    expect(type("12,5,", 5, ",").raw).toBe("125.");
  });

  it("con punto ya escrito, otra coma tecleada se ignora", () => {
    expect(type("1,234.5,", 8, ",")).toEqual({ raw: "1234.5", caret: 7 });
  });

  it("lo pegado desde Excel se normaliza", () => {
    expect(
      readTypedAmount({ text: "1.234,56", caret: 8, data: null, isPaste: true })
        .raw,
    ).toBe("1234.56");
  });

  it("lo que no es número queda como está", () => {
    expect(type("12a").raw).toBe("12a");
  });
});
