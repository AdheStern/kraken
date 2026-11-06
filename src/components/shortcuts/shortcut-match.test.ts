// src/components/shortcuts/shortcut-match.test.ts
// Atajos de teclado (decisión 2026-11-05): combinaciones, secuencias «G y una letra» con 1 s de espera y Alt por
// tecla física.
import { describe, expect, it } from "vitest";
import {
  IDLE,
  type KeyLike,
  matchesCombo,
  resolveShortcut,
} from "./shortcut-match";

const press = (key: string, extra: Partial<KeyLike> = {}): KeyLike => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : "",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

describe("matchesCombo", () => {
  it("Ctrl+K vale también con Cmd y no sin modificador", () => {
    expect(matchesCombo("Ctrl+K", press("k", { ctrlKey: true }))).toBe(true);
    expect(matchesCombo("Ctrl+K", press("k", { metaKey: true }))).toBe(true);
    expect(matchesCombo("Ctrl+K", press("k"))).toBe(false);
  });

  it("Alt+N se reconoce por la tecla física aunque el carácter cambie", () => {
    expect(
      matchesCombo("Alt+N", { ...press("˜", { altKey: true }), code: "KeyN" }),
    ).toBe(true);
    expect(matchesCombo("Alt+N", press("n", { ctrlKey: true }))).toBe(false);
  });

  it("los símbolos se comparan por el carácter", () => {
    expect(matchesCombo("?", press("?", { shiftKey: true }))).toBe(true);
    expect(matchesCombo("Ctrl+Enter", press("Enter", { ctrlKey: true }))).toBe(
      true,
    );
  });
});

describe("resolveShortcut", () => {
  const combos = ["G C", "G T", "?", "Alt+N"];

  it("G y luego C completa la secuencia", () => {
    const first = resolveShortcut(combos, press("g"), IDLE, 0);
    expect(first.match).toBeNull();
    expect(resolveShortcut(combos, press("c"), first.state, 500).match).toBe(
      "G C",
    );
  });

  it("la secuencia vence al segundo", () => {
    const first = resolveShortcut(combos, press("g"), IDLE, 0);
    expect(resolveShortcut(combos, press("c"), first.state, 1_500).match).toBe(
      null,
    );
  });

  it("una combinación suelta no necesita secuencia", () => {
    expect(
      resolveShortcut(combos, press("n", { altKey: true }), IDLE, 0).match,
    ).toBe("Alt+N");
  });
});
