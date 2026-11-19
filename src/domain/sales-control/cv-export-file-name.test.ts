// src/domain/sales-control/cv-export-file-name.test.ts
// Nombre del Excel de un CV: número, sigla y título (decisión 2026-11-19).
import { describe, expect, it } from "vitest";
import { toCvExportFileName } from "./cv-export-file-name";

const base = {
  versionLabel: "120LP-26",
  acronym: "DIACONIA",
  customerName: "Diaconía Fondo Rotativo de Inversión y Fomento",
  title: "LICENCIAS MICROSOFT SUSCRIPCIONES",
};

describe("toCvExportFileName", () => {
  it("arma número, sigla y título", () => {
    expect(toCvExportFileName(base)).toBe(
      "120LP-26 - DIACONIA - LICENCIAS MICROSOFT SUSCRIPCIONES.xlsx",
    );
  });

  it("conserva la versión del número", () => {
    expect(toCvExportFileName({ ...base, versionLabel: "120LP-26 v2" })).toBe(
      "120LP-26 v2 - DIACONIA - LICENCIAS MICROSOFT SUSCRIPCIONES.xlsx",
    );
  });

  it("sin sigla usa la razón social", () => {
    expect(
      toCvExportFileName({ ...base, acronym: "  ", title: "Licencias" }),
    ).toBe(
      "120LP-26 - Diaconía Fondo Rotativo de Inversión y Fomento - Licencias.xlsx",
    );
  });

  it("sin título queda número y sigla", () => {
    expect(toCvExportFileName({ ...base, title: null })).toBe(
      "120LP-26 - DIACONIA.xlsx",
    );
  });

  it("quita los caracteres que Windows no admite", () => {
    expect(
      toCvExportFileName({
        ...base,
        acronym: "SIN",
        title: 'Red/Wi-Fi\\LAN: "fase" 1?',
      }),
    ).toBe("120LP-26 - SIN - Red Wi-Fi LAN fase 1.xlsx");
  });

  it("acota el largo del nombre", () => {
    const name = toCvExportFileName({ ...base, title: "A".repeat(400) });
    expect(name.length).toBeLessThanOrEqual(155);
    expect(name.endsWith(".xlsx")).toBe(true);
  });
});
