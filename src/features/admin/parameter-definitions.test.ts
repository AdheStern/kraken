// src/features/admin/parameter-definitions.test.ts
// Cada parámetro valida el texto del formulario y lo guarda en la forma que leen src/server/parameters.ts
// y sus usos (umbral del GG §2.3, desvío del TC §2.2, avisos de bolsas §2.4).
import { describe, expect, it } from "vitest";
import { PARAMETER_DEFINITIONS } from "./parameter-definitions";
import { roleAreaIssue } from "./role-area-rules";

const parse = (key: keyof typeof PARAMETER_DEFINITIONS, text: string) =>
  PARAMETER_DEFINITIONS[key].parse.safeParse(text);

describe("parámetros del sistema", () => {
  it("el umbral del GG se guarda como texto con 2 decimales", () => {
    expect(parse("cv.umbral_gg_usd", "50000").data).toBe("50000.00");
    expect(parse("cv.umbral_gg_usd", " 49999.5 ").data).toBe("49999.50");
    expect(parse("cv.umbral_gg_usd", "0").success).toBe(false);
    expect(parse("cv.umbral_gg_usd", "50.000,00").success).toBe(false);
    expect(parse("cv.umbral_gg_usd", "1.234").success).toBe(false);
  });

  it("el desvío del TC es un % mayor a 0 y hasta 100", () => {
    expect(parse("fx.desvio_max_pct", "2").data).toBe("2.00");
    expect(parse("fx.desvio_max_pct", "100.01").success).toBe(false);
  });

  it("los avisos de consumo son % enteros, sin repetir y en orden", () => {
    expect(parse("horas.alerta_consumo_pct", "100, 80 80").data).toEqual([
      80, 100,
    ]);
    expect(parse("horas.alerta_consumo_pct", "80, 120").success).toBe(false);
    expect(parse("horas.alerta_consumo_pct", "").success).toBe(false);
    expect(parse("horas.alerta_consumo_pct", "80.5").success).toBe(false);
  });

  it("el aviso de vencimiento son días enteros entre 1 y 365", () => {
    expect(parse("horas.aviso_vencimiento_dias", "30").data).toBe(30);
    expect(parse("horas.aviso_vencimiento_dias", "0").success).toBe(false);
    expect(parse("horas.aviso_vencimiento_dias", "1.5").success).toBe(false);
  });
});

describe("área de cada rol", () => {
  it("el gerente de área exige área; el GG no la admite; el ingeniero la acepta o no", () => {
    expect(roleAreaIssue("GERENTE_AREA", null)).not.toBeNull();
    expect(roleAreaIssue("GERENTE_AREA", "net")).toBeNull();
    expect(roleAreaIssue("GERENTE_GENERAL", "net")).not.toBeNull();
    expect(roleAreaIssue("INGENIERO", null)).toBeNull();
    expect(roleAreaIssue("INGENIERO", "net")).toBeNull();
  });
});
