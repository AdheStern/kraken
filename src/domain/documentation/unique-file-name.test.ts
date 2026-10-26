// src/domain/documentation/unique-file-name.test.ts
// Un nombre repetido en la misma fase recibe un sufijo (AGENTS.md §2.10).
import { describe, expect, it } from "vitest";
import { toUniqueFileName } from "./unique-file-name";

describe("toUniqueFileName", () => {
  it("deja el nombre si está libre", () => {
    expect(toUniqueFileName("acta.pdf", ["otro.pdf"])).toBe("acta.pdf");
  });

  it("agrega el primer sufijo libre antes de la extensión, sin distinguir mayúsculas", () => {
    expect(toUniqueFileName("Acta.pdf", ["acta.pdf"])).toBe("Acta (2).pdf");
    expect(
      toUniqueFileName("acta.pdf", [
        "acta.pdf",
        "ACTA (2).pdf",
        "acta (3).pdf",
      ]),
    ).toBe("acta (4).pdf");
  });

  it("sin extensión o con punto inicial el sufijo va al final", () => {
    expect(toUniqueFileName("LEEME", ["leeme"])).toBe("LEEME (2)");
    expect(toUniqueFileName(".env", [".env"])).toBe(".env (2)");
  });
});
