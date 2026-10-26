// src/features/help/manual-registry.test.ts
// Elección del manual por rol (AGENTS.md §12 F6): primero los roles propios, cualquiera se puede consultar.
import { describe, expect, it } from "vitest";
import { chooseManual, MANUALS } from "./manual-registry";

describe("chooseManual", () => {
  it("abre el manual del primer rol del usuario y lo pone primero", () => {
    const choice = chooseManual(["INGENIERO"], undefined);
    expect(choice.role).toBe("INGENIERO");
    expect(choice.tabs[0]).toMatchObject({ role: "INGENIERO", isOwn: true });
    expect(choice.tabs.filter((t) => t.isOwn)).toHaveLength(1);
  });

  it("permite consultar el manual de otro rol", () => {
    const choice = chooseManual(["INGENIERO"], "COMERCIAL");
    expect(choice.manual).toBe(MANUALS.COMERCIAL);
  });

  it("ignora un rol desconocido o sin manual", () => {
    expect(chooseManual(["COMERCIAL"], "__proto__").role).toBe("COMERCIAL");
    expect(chooseManual(["COMERCIAL"], "NO_EXISTE").role).toBe("COMERCIAL");
  });

  it("sin roles con manual, abre el primero del orden", () => {
    expect(chooseManual([], undefined).role).toBe("GERENTE_GENERAL");
  });

  it("cada manual tiene secciones con pasos y enlaces internos", () => {
    for (const manual of Object.values(MANUALS)) {
      expect(manual.sections.length).toBeGreaterThan(0);
      for (const section of manual.sections) {
        expect(section.steps.length).toBeGreaterThan(0);
        if (section.link) expect(section.link.href).toMatch(/^\/[a-z]/);
      }
    }
  });
});
