// tests/integration/cv-numbering.int.test.ts
// Correlativo de CV bajo concurrencia: sin huecos ni repetidos, independiente por ciudad y año (AGENTS.md §2.1).
import { afterAll, describe, expect, it } from "vitest";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";
import { createCity, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

function allocate(cityId: string, year: number) {
  return db.$transaction((tx) => allocateCvNumber(tx, cityId, year));
}

describe("allocateCvNumber", () => {
  it("20 asignaciones concurrentes dan 1..20 sin repetir", async () => {
    const city = await createCity(db);
    const numbers = await Promise.all(
      Array.from({ length: 20 }, () => allocate(city.id, 2026)),
    );
    expect([...numbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it("cada ciudad y cada año llevan su propio correlativo", async () => {
    const lp = await createCity(db);
    const sc = await createCity(db);
    await allocate(lp.id, 2026);
    await allocate(lp.id, 2026);
    expect(await allocate(sc.id, 2026)).toBe(1);
    expect(await allocate(lp.id, 2027)).toBe(1);
    expect(await allocate(lp.id, 2026)).toBe(3);
  });

  it("una transacción revertida no deja huecos ni duplicados", async () => {
    const city = await createCity(db);
    await allocate(city.id, 2026);
    // POR QUÉ: el rollback devuelve el contador porque ningún CV llegó a usar ese número.
    await expect(
      db.$transaction(async (tx) => {
        await allocateCvNumber(tx, city.id, 2026);
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await allocate(city.id, 2026)).toBe(2);
  });
});
