// src/domain/sales-control/parse-decimal-text.test.ts
// Números escritos o pegados desde Excel en formatos boliviano e inglés.
import { describe, expect, it } from "vitest";
import { parseDecimalText } from "./parse-decimal-text";

describe("parseDecimalText", () => {
  it.each([
    ["985.76", "985.76"],
    ["985,76", "985.76"],
    ["12,5", "12.5"],
    ["1.234,56", "1234.56"],
    ["1,234.56", "1234.56"],
    ["1.234", "1234"],
    ["1,234", "1234"],
    ["1.234.567", "1234567"],
    ["US$ 6,860.89", "6860.89"],
    ["Bs 910,37", "910.37"],
    ["$1 234,50", "1234.50"],
    ["0045.22", "45.22"],
    ["-12,50", "-12.50"],
    ["-0", "0"],
    ["7", "7"],
  ])("%s → %s", (text, expected) => {
    expect(parseDecimalText(text)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["abc"],
    ["12a"],
    ["1.23.4"],
    ["1,2,3"],
    [","],
  ])("%j no es número", (text) => {
    expect(parseDecimalText(text)).toBeNull();
  });
});
