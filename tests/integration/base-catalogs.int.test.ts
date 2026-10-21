// tests/integration/base-catalogs.int.test.ts
// Carga de catálogos base (AGENTS.md §12, F0): repetible, sin duplicar lo cargado a mano con otras mayúsculas
// y sin deshacer lo que el administrador cambió.
import { afterAll, describe, expect, it } from "vitest";
import * as data from "../../prisma/seed/base-catalog-data";
import { seedBaseCatalogs } from "../../prisma/seed/base-catalogs";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const seed = () => db.$transaction((tx) => seedBaseCatalogs(tx));

describe("seedBaseCatalogs", () => {
  it("crea lo que falta, respeta lo editado y la segunda corrida no crea nada", async () => {
    await db.technology.create({ data: { name: "Cisco" } });
    const lpCity = await db.city.create({
      data: { code: "LP", name: "La Paz (editada)" },
    });
    await db.warehouse.create({
      data: {
        code: "ALM-LP",
        name: "Central",
        kind: "FISICO",
        cityId: lpCity.id,
      },
    });

    expect(await seed()).toBeGreaterThan(0);
    expect(await seed()).toBe(0);

    expect(await db.warehouse.count({ where: { code: "LP" } })).toBe(0);
    const sc = await db.warehouse.findUniqueOrThrow({
      where: { code: "SC" },
      include: { city: true },
    });
    expect(sc.city?.code).toBe("SC");
    expect(await db.warehouse.count({ where: { kind: "TRANSITO" } })).toBe(1);

    const cisco = await db.technology.findMany({
      where: { name: { equals: "CISCO", mode: "insensitive" } },
    });
    expect(cisco.map((t) => t.name)).toEqual(["Cisco"]);
    const lp = await db.city.findUniqueOrThrow({ where: { code: "LP" } });
    expect(lp.name).toBe("La Paz (editada)");
    expect(await db.area.count({ where: { code: "DIMANET" } })).toBe(1);
    const hours = await db.unit.findUniqueOrThrow({ where: { code: "HORAS" } });
    expect(hours.isHours).toBe(true);
    expect(await db.serviceType.count()).toBeGreaterThanOrEqual(
      data.SERVICE_TYPES.length,
    );
    expect(await db.role.count()).toBe(9);
  });

  it("no reactiva un catálogo dado de baja", async () => {
    await db.unit.update({
      where: { code: "ROLLO" },
      data: { isActive: false },
    });
    await seed();
    const rollo = await db.unit.findUniqueOrThrow({ where: { code: "ROLLO" } });
    expect(rollo.isActive).toBe(false);
  });
});
