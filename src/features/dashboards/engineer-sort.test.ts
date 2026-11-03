// src/features/dashboards/engineer-sort.test.ts
// Orden del listado de ingenieros (AGENTS.md §6): parámetros válidos, columna desconocida y nulos al final.
import { describe, expect, it } from "vitest";
import { sortEngineerRows, toEngineerSort } from "./engineer-sort";
import type { EngineerRow } from "./types";

const row = (
  name: string,
  slaPct: number | null,
  loggedMinutes = 0,
): EngineerRow => ({
  userId: name,
  name,
  loggedMinutes,
  outsidePct: null,
  utilizationPct: null,
  ownedResolved: 0,
  participated: 0,
  chargedMinutes: 0,
  slaPct,
  medianResolutionMinutes: null,
  latePct: null,
});

describe("toEngineerSort", () => {
  it("acepta columnas conocidas y vuelve al orden por defecto con las demás", () => {
    expect(toEngineerSort("slaPct", "asc")).toEqual({
      key: "slaPct",
      dir: "asc",
    });
    expect(toEngineerSort("slaPct", "x")).toEqual({
      key: "slaPct",
      dir: "desc",
    });
    expect(toEngineerSort("__proto__", "asc")).toEqual({
      key: "loggedMinutes",
      dir: "desc",
    });
  });
});

describe("sortEngineerRows", () => {
  it("ordena en ambas direcciones con los nulos siempre al final", () => {
    const rows = [row("Bruno", 40), row("Ana", null), row("Carla", 90)];
    const names = (dir: "asc" | "desc") =>
      sortEngineerRows(rows, { key: "slaPct", dir }).map((r) => r.name);
    expect(names("desc")).toEqual(["Carla", "Bruno", "Ana"]);
    expect(names("asc")).toEqual(["Bruno", "Carla", "Ana"]);
    expect(
      sortEngineerRows(rows, { key: "name", dir: "asc" }).map((r) => r.name),
    ).toEqual(["Ana", "Bruno", "Carla"]);
  });
});
