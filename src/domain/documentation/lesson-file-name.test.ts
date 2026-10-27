// src/domain/documentation/lesson-file-name.test.ts
// Nombre del .txt de una lección aprendida (AGENTS.md §2.10).
import { describe, expect, it } from "vitest";
import { toLessonFileName } from "./lesson-file-name";

describe("toLessonFileName", () => {
  it("antepone el prefijo y agrega la extensión .txt", () => {
    expect(toLessonFileName("Migración de VLAN")).toBe(
      "Lección aprendida - Migración de VLAN.txt",
    );
  });

  it("compacta saltos de línea y espacios del título", () => {
    expect(toLessonFileName("  Corte\n de   energía ")).toBe(
      "Lección aprendida - Corte de energía.txt",
    );
  });
});
