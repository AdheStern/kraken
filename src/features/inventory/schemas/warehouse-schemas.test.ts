// src/features/inventory/schemas/warehouse-schemas.test.ts
// Alta y edición de almacenes (AGENTS.md §2.8): código y tipo al crear, ciudad obligatoria en el físico y
// TRANSITO fuera del alta manual.
import { describe, expect, it } from "vitest";
import { warehouseSchema } from "./warehouse-schemas";

const CITY = "0199f3b0-0000-7000-8000-000000000001";
const ID = "0199f3b0-0000-7000-8000-000000000002";

const issue = (input: unknown) => {
  const parsed = warehouseSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0].message;
};

describe("warehouseSchema", () => {
  it("crea un físico con código en mayúsculas y su ciudad", () => {
    const parsed = warehouseSchema.parse({
      id: null,
      code: " lp-2 ",
      name: "Almacén El Alto",
      kind: "FISICO",
      cityId: CITY,
    });
    expect(parsed.code).toBe("LP-2");
  });

  it("exige ciudad al físico y código y tipo al nuevo", () => {
    expect(
      issue({
        id: null,
        code: "LP",
        name: "Central",
        kind: "FISICO",
        cityId: null,
      }),
    ).toBe("Un almacén físico necesita su ciudad.");
    expect(issue({ id: null, name: "Central", cityId: CITY })).toBe(
      "Indica el código y el tipo del almacén nuevo.",
    );
  });

  it("la edición cambia solo nombre y ciudad", () => {
    expect(issue({ id: ID, name: "Repuestos LP", cityId: null })).toBeNull();
  });

  it("no crea TRANSITO a mano ni acepta códigos inválidos", () => {
    expect(
      issue({
        id: null,
        code: "TR",
        name: "Otro",
        kind: "TRANSITO",
        cityId: null,
      }),
    ).not.toBeNull();
    expect(
      issue({
        id: null,
        code: "L P",
        name: "Central",
        kind: "REPUESTOS",
        cityId: null,
      }),
    ).toBe("El código lleva de 2 a 12 letras, números o guiones.");
  });
});
