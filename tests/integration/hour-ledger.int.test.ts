// tests/integration/hour-ledger.int.test.ts
// Libro mayor de bolsas contra la base (AGENTS.md §2.4, ADR-03): saldo = suma del libro, estados,
// concurrencia con FOR UPDATE, inmutabilidad, cierres y contratos por vigencia sin tope.
import { afterAll, describe, expect, it } from "vitest";
import {
  BagStateError,
  InsufficientBalanceError,
} from "@/server/hours/hour-errors";
import {
  type HourMovementInput,
  postHourMovement,
} from "@/server/hours/post-hour-movement";
import { createHourBagFixture, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function bagWith(minutes: number) {
  const f = await createHourBagFixture(db);
  await post({ bagId: f.bag.id, kind: "APERTURA", minutes, actorId: f.userId });
  return f;
}

const post = (input: HourMovementInput) =>
  db.$transaction((tx) => postHourMovement(tx, input));

async function snapshot(bagId: string) {
  const bag = await db.hourBag.findUniqueOrThrow({ where: { id: bagId } });
  const ledger = await db.hourMovement.aggregate({
    where: { bagId },
    _sum: { minutes: true },
  });
  return {
    balance: bag.balanceMinutes,
    status: bag.status,
    ledger: ledger._sum.minutes,
  };
}

describe("postHourMovement", () => {
  it("el saldo es la suma del libro y el estado sigue al saldo", async () => {
    const f = await bagWith(90);
    expect(await snapshot(f.bag.id)).toEqual({
      balance: 90,
      status: "ACTIVA",
      ledger: 90,
    });
    const used = await post({
      bagId: f.bag.id,
      kind: "CONSUMO",
      minutes: -90,
      actorId: f.userId,
    });
    expect(used).toMatchObject({
      balanceBefore: 90,
      balanceAfter: 0,
      statusBefore: "ACTIVA",
      status: "AGOTADA",
    });
    await post({
      bagId: f.bag.id,
      kind: "AJUSTE",
      minutes: 30,
      actorId: f.userId,
      reason: "Cortesía",
    });
    expect(await snapshot(f.bag.id)).toEqual({
      balance: 30,
      status: "ACTIVA",
      ledger: 30,
    });
  });

  it("dos débitos simultáneos de 60 sobre 90: uno gana y el saldo nunca es negativo", async () => {
    const f = await bagWith(90);
    const debit = () =>
      post({
        bagId: f.bag.id,
        kind: "CONSUMO",
        minutes: -60,
        actorId: f.userId,
      });
    const results = await Promise.allSettled([debit(), debit()]);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InsufficientBalanceError,
    );
    expect(await snapshot(f.bag.id)).toEqual({
      balance: 30,
      status: "ACTIVA",
      ledger: 30,
    });
  });

  it("rechaza un débito mayor que el saldo sin escribir nada", async () => {
    const f = await bagWith(30);
    await expect(
      post({
        bagId: f.bag.id,
        kind: "CONSUMO",
        minutes: -31,
        actorId: f.userId,
      }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(await db.hourMovement.count({ where: { bagId: f.bag.id } })).toBe(1);
  });

  it("cierra con un AJUSTE por el saldo y después no admite movimientos", async () => {
    const f = await bagWith(45);
    const closed = await post({
      bagId: f.bag.id,
      kind: "AJUSTE",
      minutes: -45,
      actorId: f.userId,
      reason: "Línea quitada en v2",
      endAs: "CERRADA",
    });
    expect(closed.status).toBe("CERRADA");
    await expect(
      post({ bagId: f.bag.id, kind: "AJUSTE", minutes: 10, actorId: f.userId }),
    ).rejects.toBeInstanceOf(BagStateError);
  });

  it("no cierra una bolsa que conservaría saldo ni acepta minutos inválidos", async () => {
    const f = await bagWith(45);
    await expect(
      post({
        bagId: f.bag.id,
        kind: "AJUSTE",
        minutes: -10,
        actorId: f.userId,
        endAs: "CERRADA",
      }),
    ).rejects.toBeInstanceOf(BagStateError);
    await expect(
      post({
        bagId: f.bag.id,
        kind: "AJUSTE",
        minutes: 1.5,
        actorId: f.userId,
      }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      post({ bagId: f.bag.id, kind: "AJUSTE", minutes: 0, actorId: f.userId }),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it("el libro es inmutable: UPDATE y DELETE fallan por el trigger", async () => {
    const f = await bagWith(60);
    const movement = await db.hourMovement.findFirstOrThrow({
      where: { bagId: f.bag.id },
    });
    await expect(
      db.hourMovement.update({
        where: { id: movement.id },
        data: { minutes: 600 },
      }),
    ).rejects.toThrow(/inmutable/);
    await expect(
      db.hourMovement.delete({ where: { id: movement.id } }),
    ).rejects.toThrow(/inmutable/);
  });
});

describe("contrato por vigencia sin tope", () => {
  it("cada consumo baja el saldo bajo 0 (es lo usado), sigue ACTIVA y se cierra conservando el uso", async () => {
    const f = await createHourBagFixture(db);
    await db.hourBag.update({
      where: { id: f.bag.id },
      data: { kind: "VIGENCIA", isUncapped: true },
    });
    const consume = (minutes: number) =>
      post({ bagId: f.bag.id, kind: "CONSUMO", minutes, actorId: f.userId });
    await consume(-270);
    await consume(-30);
    expect(await snapshot(f.bag.id)).toEqual({
      balance: -300,
      status: "ACTIVA",
      ledger: -300,
    });
    await post({
      bagId: f.bag.id,
      kind: "AJUSTE",
      minutes: 0,
      actorId: f.userId,
      endAs: "CERRADA",
    });
    expect(await snapshot(f.bag.id)).toMatchObject({
      balance: -300,
      status: "CERRADA",
    });
  });

  it("el CHECK de la base rechaza un saldo negativo en una bolsa con tope", async () => {
    const f = await createHourBagFixture(db);
    await expect(
      db.hourBag.update({
        where: { id: f.bag.id },
        data: { balanceMinutes: -1 },
      }),
    ).rejects.toThrow(/bolsa_saldo_no_negativo_ck/);
  });
});
