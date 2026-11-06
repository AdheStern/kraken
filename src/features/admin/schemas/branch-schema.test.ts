// src/features/admin/schemas/branch-schema.test.ts
// Sucursal de un cliente (decisión 2026-11-06): coordenadas opcionales, juntas, en grados con hasta 6 decimales.
import { describe, expect, it } from "vitest";
import { branchSchema } from "./branch-schema";

const base = {
  id: null,
  customerId: "0192f0a0-0000-7000-8000-000000000001",
  name: "Sucursal Yacuiba",
  address: "",
  municipalityId: null,
  phone: "",
  latitude: "",
  longitude: "",
};

describe("branchSchema", () => {
  it("sin coordenadas queda en null", () => {
    expect(branchSchema.parse(base)).toMatchObject({
      latitude: null,
      longitude: null,
      address: null,
    });
  });

  it("acepta coma decimal y guarda el texto exacto", () => {
    expect(
      branchSchema.parse({
        ...base,
        latitude: "-22,0167",
        longitude: "-63.6833",
      }),
    ).toMatchObject({ latitude: "-22.0167", longitude: "-63.6833" });
  });

  it("exige las dos coordenadas y un rango válido", () => {
    expect(branchSchema.safeParse({ ...base, latitude: "-16.5" }).success).toBe(
      false,
    );
    expect(
      branchSchema.safeParse({ ...base, latitude: "95", longitude: "10" })
        .success,
    ).toBe(false);
  });
});
