// tests/integration/hour-bag-alerts.int.test.ts
// Alertas de consumo y cambios manuales de una bolsa (AGENTS.md §2.4 alertas, §2.9 ajuste manual, ADR-08):
// el aviso queda en la bandeja y el outbox en la misma transacción del movimiento.
import { afterAll, describe, expect, it } from "vitest";
import { changeBagManually } from "@/server/hours/change-bag-manually";
import { InsufficientBalanceError } from "@/server/hours/hour-errors";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import {
  createHourBagFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function bagWith(minutes: number) {
  const f = await createHourBagFixture(db);
  await db.$transaction((tx) =>
    postHourMovement(tx, {
      bagId: f.bag.id,
      kind: "APERTURA",
      minutes,
      actorId: f.userId,
    }),
  );
  const manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: f.area.id },
  ]);
  return { ...f, manager };
}

const consume = (bagId: string, minutes: number, actorId: string) =>
  db.$transaction((tx) =>
    postHourMovement(tx, {
      bagId,
      kind: "CONSUMO",
      minutes: -minutes,
      actorId,
    }),
  );

const inbox = (userId: string, eventType: string) =>
  db.inboxItem.findMany({ where: { userId, eventType } });

describe("alertas de consumo", () => {
  it("avisa al cruzar el 80% y al agotarse, una vez cada umbral", async () => {
    const f = await bagWith(100);
    await consume(f.bag.id, 70, f.manager.id);
    expect(await inbox(f.userId, "BOLSA_UMBRAL")).toHaveLength(0);
    await consume(f.bag.id, 15, f.manager.id);
    const [alert] = await inbox(f.userId, "BOLSA_UMBRAL");
    expect(alert.title).toContain("80%");
    expect(alert.link).toBe(`/horas/${f.bag.id}`);
    await consume(f.bag.id, 5, f.manager.id);
    expect(await inbox(f.userId, "BOLSA_UMBRAL")).toHaveLength(1);
    await consume(f.bag.id, 10, f.manager.id);
    expect(await inbox(f.userId, "BOLSA_AGOTADA")).toHaveLength(1);
    expect(
      await db.outboxMessage.count({
        where: { eventType: { in: ["BOLSA_UMBRAL", "BOLSA_AGOTADA"] } },
      }),
    ).toBeGreaterThanOrEqual(2);
  });

  it("el gerente del área también recibe la alerta, pero no quien registró el movimiento", async () => {
    const f = await bagWith(100);
    await consume(f.bag.id, 90, f.userId);
    expect(await inbox(f.manager.id, "BOLSA_UMBRAL")).toHaveLength(1);
    expect(await inbox(f.userId, "BOLSA_UMBRAL")).toHaveLength(0);
  });
});

describe("ajuste manual y cierre", () => {
  it("el gerente del área suma horas con motivo y avisa al comercial", async () => {
    const f = await bagWith(60);
    const result = await db.$transaction((tx) =>
      changeBagManually(tx, f.manager, {
        kind: "AJUSTE",
        bagId: f.bag.id,
        minutes: 90,
        reason: "Cortesía por demora",
      }),
    );
    expect(result).toEqual({ ok: true, data: { balanceMinutes: 150 } });
    expect(await inbox(f.userId, "BOLSA_AJUSTADA")).toHaveLength(1);
  });

  it("un gerente de otra área no puede ajustar", async () => {
    const f = await bagWith(60);
    const other = await createUserWithRoles(db, "Otro gerente", [
      {
        code: "GERENTE_AREA",
        areaId: (
          await db.area.create({
            data: { code: `X-${f.bag.id.slice(0, 6)}`, name: "Otra" },
          })
        ).id,
      },
    ]);
    expect(
      await db.$transaction((tx) =>
        changeBagManually(tx, other, {
          kind: "AJUSTE",
          bagId: f.bag.id,
          minutes: 30,
          reason: "No corresponde",
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("restar más que el saldo falla sin escribir", async () => {
    const f = await bagWith(60);
    await expect(
      db.$transaction((tx) =>
        changeBagManually(tx, f.manager, {
          kind: "AJUSTE",
          bagId: f.bag.id,
          minutes: -61,
          reason: "Corrección",
        }),
      ),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(await db.hourMovement.count({ where: { bagId: f.bag.id } })).toBe(1);
  });

  it("cerrar ajusta por el saldo y deja la bolsa CERRADA", async () => {
    const f = await bagWith(60);
    await db.$transaction((tx) =>
      changeBagManually(tx, f.manager, {
        kind: "CIERRE",
        bagId: f.bag.id,
        reason: "Contrato terminado",
      }),
    );
    const bag = await db.hourBag.findUniqueOrThrow({ where: { id: f.bag.id } });
    expect(bag).toMatchObject({ status: "CERRADA", balanceMinutes: 0 });
    expect(await inbox(f.userId, "BOLSA_CERRADA")).toHaveLength(1);
  });
});
