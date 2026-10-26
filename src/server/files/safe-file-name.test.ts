// src/server/files/safe-file-name.test.ts
// Nombres de archivo y carpeta aceptados por SharePoint y Windows (ADR-16).
import { describe, expect, it } from "vitest";
import { toSafeFileName, toSafeFolderName } from "./safe-file-name";

describe("toSafeFileName", () => {
  it("quita la ruta y los caracteres prohibidos", () => {
    expect(toSafeFileName("acta/../acta: final.txt")).toBe("acta_ final.txt");
    expect(toSafeFileName("C:\\docs\\plan#1.pdf")).toBe("plan_1.pdf");
    expect(toSafeFileName("  ")).toBe("archivo");
  });
});

describe("toSafeFolderName", () => {
  it("convierte barras en guiones y quita el punto final", () => {
    expect(toSafeFolderName("Banco A/B S.A.")).toBe("Banco A-B S.A");
    expect(toSafeFolderName("Fase: diseño")).toBe("Fase_ diseño");
    expect(toSafeFolderName("...")).toBe("sin nombre");
  });
});
