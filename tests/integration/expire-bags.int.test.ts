// tests/integration/expire-bags.int.test.ts
// Job bags.expire con reloj fijo (AGENTS.md §2.4 vencimiento y alertas): vence con VENCIMIENTO por el saldo,
// avisa 30 días antes y el mismo día, y una segunda corrida no duplica nada.
import { afterAll, describe, expect, it } from "vitest";
import { expireBags } from "@/server/hours/expire-bags";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { createHourBagFixture, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
// Martes 13/10/2026, 00:05 en La Paz.
const clock = { now: () => new Date("2026-10-13T04:05:00Z") };

async function bagExpiring(expiresOn: string, minutes = 120) {
  const f = await createHourBagFixture(db);
  await db.hourBag.update({
    where: { id: f.bag.id },
    data: { expiresOn: new Date(`${expiresOn}T00:00:00Z`) },
  });
  await db.$transaction((tx) =>
    postHourMovement(tx, {
      bagId: f.bag.id,
      kind: "APERTURA",
      minutes,
      actorId: f.userId,
    }),
  );
  return f;
}

const inbox = (userId: string, eventType: string) =>
  db.inboxItem.findMany({ where: { userId, eventType } });

describe("expireBags", () => {
  it("vence la bolsa del día anterior con VENCIMIENTO por su saldo, sin actor", async () => {
    const f = await bagExpiring("2026-10-12", 120);
    await expireBags(db, clock);
    const bag = await db.hourBag.findUniqueOrThrow({
      where: { id: f.bag.id },
      include: { movements: { orderBy: { createdAt: "asc" } } },
    });
    expect(bag).toMatchObject({ status: "VENCIDA", balanceMinutes: 0 });
    expect(bag.movements.at(-1)).toMatchObject({
      kind: "VENCIMIENTO",
      minutes: -120,
      actorId: null,
    });
    const [notice] = await inbox(f.userId, "BOLSA_VENCIDA");
    expect(notice.body).toContain("2 h sin usar");
  });

  it("la bolsa vale todo el día de su vencimiento: hoy solo avisa", async () => {
    const f = await bagExpiring("2026-10-13");
    await expireBags(db, clock);
    expect(
      (await db.hourBag.findUniqueOrThrow({ where: { id: f.bag.id } })).status,
    ).toBe("ACTIVA");
    expect((await inbox(f.userId, "BOLSA_POR_VENCER"))[0].title).toContain(
      "vence hoy",
    );
  });

  it("avisa una sola vez dentro de los 30 días y no avisa antes", async () => {
    const soon = await bagExpiring("2026-11-12");
    const later = await bagExpiring("2026-11-13");
    await expireBags(db, clock);
    await expireBags(db, clock);
    expect(await inbox(soon.userId, "BOLSA_POR_VENCER")).toHaveLength(1);
    expect(await inbox(later.userId, "BOLSA_POR_VENCER")).toHaveLength(0);
  });

  it("una segunda corrida no vuelve a vencer ni duplica movimientos", async () => {
    const f = await bagExpiring("2026-10-01", 30);
    await expireBags(db, clock);
    await expireBags(db, clock);
    expect(
      await db.hourMovement.count({
        where: { bagId: f.bag.id, kind: "VENCIMIENTO" },
      }),
    ).toBe(1);
    expect(await inbox(f.userId, "BOLSA_VENCIDA")).toHaveLength(1);
  });
});
