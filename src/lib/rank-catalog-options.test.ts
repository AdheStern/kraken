// src/lib/rank-catalog-options.test.ts
// Orden y coincidencias de la búsqueda de los selectores de catálogo (municipios con su departamento como ayuda).
import { describe, expect, it } from "vitest";
import { rankCatalogOptions } from "./rank-catalog-options";

const municipalities = [
  { id: "1", label: "Achocalla", hint: "La Paz" },
  { id: "2", label: "El Alto", hint: "La Paz" },
  { id: "3", label: "La Paz", hint: "La Paz" },
  { id: "4", label: "Palca", hint: "La Paz" },
  { id: "5", label: "Paz de Ayopaya", hint: "Cochabamba" },
  { id: "6", label: "Potosí", hint: "Potosí" },
  { id: "7", label: "Santa Cruz de la Sierra", hint: "Santa Cruz" },
];
const ids = (query: string) =>
  rankCatalogOptions(municipalities, query).map((m) => m.id);

describe("rankCatalogOptions", () => {
  it("sin texto devuelve todas en su orden", () => {
    expect(ids("  ")).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("la etiqueta exacta va primero y las que solo coinciden por la ayuda al final", () => {
    expect(ids("la paz")).toEqual(["3", "1", "2", "4"]);
    expect(ids("paz")).toEqual(["5", "3", "1", "2", "4"]);
  });

  it("ignora tildes, mayúsculas y espacios de más", () => {
    expect(ids("POTOSI")).toEqual(["6"]);
    expect(ids("  santa   cruz ")).toEqual(["7"]);
  });

  it("«departamento, municipio» busca la ayuda y la etiqueta, en cualquier orden", () => {
    expect(ids("la paz, la paz")).toEqual(["3"]);
    expect(ids("la paz, al")).toEqual(["1", "2", "4"]);
    expect(ids("alto, la paz")).toEqual(["2"]);
    expect(ids("cochabamba, paz")).toEqual(["5"]);
  });

  it("sin coincidencias devuelve una lista vacía", () => {
    expect(ids("oruro")).toEqual([]);
    expect(ids("santa cruz, la paz")).toEqual([]);
  });
});
