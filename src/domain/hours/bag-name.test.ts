// src/domain/hours/bag-name.test.ts
// Nombre visible de una bolsa (AGENTS.md §2.4).
import { describe, expect, it } from "vitest";
import { toBagName } from "./bag-name";

describe("toBagName", () => {
  it("usa el nombre que le pusieron", () => {
    expect(toBagName("Soporte Fortinet 2026", "Servicios conexos")).toBe(
      "Soporte Fortinet 2026",
    );
  });

  it("sin nombre, usa la descripción de la línea del CV", () => {
    expect(toBagName(null, "Servicios conexos")).toBe("Servicios conexos");
  });
});
