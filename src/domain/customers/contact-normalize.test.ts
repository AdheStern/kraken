// src/domain/customers/contact-normalize.test.ts
// Normalización de contactos (decisión 2026-11-06): la misma persona aunque se escriba distinto.
import { describe, expect, it } from "vitest";
import {
  normalizeContactName,
  normalizeEmail,
  normalizePhone,
} from "./contact-normalize";

describe("normalizeContactName", () => {
  it("quita tildes, mayúsculas y espacios de más", () => {
    expect(normalizeContactName("  José   PÉREZ Ñuflo ")).toBe(
      "jose perez nuflo",
    );
  });
});

describe("normalizeEmail", () => {
  it("compara sin mayúsculas y vacío es null", () => {
    expect(normalizeEmail(" Juan.Perez@Banco.BO ")).toBe("juan.perez@banco.bo");
    expect(normalizeEmail("  ")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("deja solo los dígitos locales, con o sin 591", () => {
    expect(normalizePhone("+591 7123-4567")).toBe("71234567");
    expect(normalizePhone("591 71234567")).toBe("71234567");
    expect(normalizePhone("(2) 2-441122")).toBe("22441122");
  });

  it("un teléfono demasiado corto no sirve para comparar", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});
