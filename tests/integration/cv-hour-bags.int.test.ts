// tests/integration/cv-hour-bags.int.test.ts
// Bolsas de horas desde el CV contra la base (AGENTS.md §2.3, §2.4, §8): apertura al aprobar, ajuste y cierre
// por versión, saldo insuficiente al enviar y al aprobar, bolsas terminales y anulación.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { BagPlanError } from "@/server/hours/hour-errors";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { decideRequest } from "@/server/sales-control/decide-request";
import { startNewVersion } from "@/server/sales-control/start-new-version";
import { submitVersion } from "@/server/sales-control/submit-version";
import { voidLatestVersion } from "@/server/sales-control/void-version";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const NOW = new Date("2026-10-13T15:00:00Z");

let area: { id: string };
let hoursUnitId: string;
let manager: SessionUser;
let seller: SessionUser;

type HourLine = {
  hours: string;
  modality?: "H8X5" | "H24X7";
  scope?: "AREA" | "GENERAL";
  expiresOn?: string | null;
};

beforeAll(async () => {
  const tag = randomUUID().slice(0, 6);
  area = await db.area.create({ data: { code: `NET-${tag}`, name: "Red" } });
  hoursUnitId = (
    await db.unit.create({
      data: { code: `H-${tag}`, name: "Horas", isHours: true },
    })
  ).id;
  manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: area.id },
  ]);
  seller = await createUserWithRoles(db, "Comercial", [{ code: "COMERCIAL" }]);
});

async function addHourLines(versionId: string, lines: HourLine[]) {
  for (const [index, line] of lines.entries()) {
    await db.cvLine.create({
      data: {
        versionId,
        position: index + 1,
        kind: "ITEM",
        itemType: "SERVICIO",
        unitId: hoursUnitId,
        areaId: area.id,
        description: `Horas ${index + 1}`,
        quantity: line.hours,
        unitCostUsd: "0",
        unitSaleUsd: "0",
        pricingSource: "PRECIO",
        hourBagSpec: {
          modality: line.modality ?? "H8X5",
          scope: line.scope ?? "AREA",
          areaIds: (line.scope ?? "AREA") === "AREA" ? [area.id] : [],
          projectId: null,
          expiresOn:
            line.expiresOn === undefined ? "2027-06-30" : line.expiresOn,
        },
      },
    });
  }
}

async function approvedCv(lines: HourLine[], isOpeningBalance = false) {
  const f = await createCvFixture(db);
  await db.cv.update({
    where: { id: f.cv.id },
    data: { createdById: seller.id, isOpeningBalance },
  });
  await addHourLines(f.version.id, lines);
  expect(await submit(f.version.id)).toMatchObject({ ok: true });
  expect(await approve(f.version.id)).toMatchObject({ ok: true });
  return f;
}

const submit = (versionId: string) =>
  db.$transaction((tx) =>
    submitVersion(tx, seller, versionId, {
      thresholdUsd: "50000.00",
      now: NOW,
    }),
  );

async function approve(versionId: string) {
  const request = await db.cvApprovalRequest.findFirstOrThrow({
    where: { versionId, status: "PENDIENTE" },
  });
  return db.$transaction((tx) =>
    decideRequest(
      tx,
      manager,
      { requestId: request.id, decision: "APROBADA", comment: "" },
      NOW,
    ),
  );
}

async function newVersion(cvId: string) {
  await db.$transaction((tx) =>
    startNewVersion(tx, seller, { cvId, reason: "Cambio de alcance" }),
  );
  const version = await db.cvVersion.findFirstOrThrow({
    where: { cvId },
    orderBy: { number: "desc" },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  return version;
}

const bagsOf = (cvId: string) =>
  db.hourBag.findMany({
    where: { cvLine: { version: { cvId } } },
    include: { movements: { orderBy: { createdAt: "asc" } }, areas: true },
    orderBy: { createdAt: "asc" },
  });

const consume = (bagId: string, minutes: number) =>
  db.$transaction((tx) =>
    postHourMovement(tx, {
      bagId,
      kind: "CONSUMO",
      minutes: -minutes,
      actorId: seller.id,
    }),
  );

describe("bolsas al aprobar un CV", () => {
  it("la v1 abre una bolsa por línea de horas con su APERTURA", async () => {
    const f = await approvedCv([
      { hours: "20" },
      { hours: "10", modality: "H24X7", scope: "GENERAL" },
    ]);
    const bags = await bagsOf(f.cv.id);
    expect(bags.map((b) => [b.modality, b.scope, b.balanceMinutes])).toEqual([
      ["H8X5", "AREA", 1200],
      ["H24X7", "GENERAL", 600],
    ]);
    expect(bags[0].movements.map((m) => [m.kind, m.minutes])).toEqual([
      ["APERTURA", 1200],
    ]);
    // REGLA: con alcance GENERAL la bolsa queda en el área de la línea (§2.9).
    expect(bags.every((b) => b.areas[0]?.areaId === area.id)).toBe(true);
    expect(bags[0].customerId).toBe(f.customer.id);
  });

  it("la v2 con +10 h ajusta +600 y quitar una línea cierra su bolsa", async () => {
    const f = await approvedCv([{ hours: "20" }, { hours: "10" }]);
    const v2 = await newVersion(f.cv.id);
    await db.cvLine.update({
      where: { id: v2.lines[0].id },
      data: { quantity: "30" },
    });
    await db.cvLine.delete({ where: { id: v2.lines[1].id } });
    expect(await submit(v2.id)).toMatchObject({ ok: true });
    expect(await approve(v2.id)).toMatchObject({ ok: true });

    const [kept, removed] = await bagsOf(f.cv.id);
    expect(kept.balanceMinutes).toBe(1800);
    expect(kept.cvLineId).toBe(v2.lines[0].id);
    expect(kept.movements.at(-1)).toMatchObject({
      kind: "AJUSTE",
      minutes: 600,
    });
    expect(removed).toMatchObject({ status: "CERRADA", balanceMinutes: 0 });
    expect(removed.movements.at(-1)).toMatchObject({
      kind: "AJUSTE",
      minutes: -600,
    });
  });

  it("no deja enviar una reducción mayor que el saldo", async () => {
    const f = await approvedCv([{ hours: "20" }]);
    const [bag] = await bagsOf(f.cv.id);
    await consume(bag.id, 1000);
    const v2 = await newVersion(f.cv.id);
    await db.cvLine.update({
      where: { id: v2.lines[0].id },
      data: { quantity: "2" },
    });
    expect(await submit(v2.id)).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_BALANCE" },
    });
    expect(
      (await db.cvVersion.findUniqueOrThrow({ where: { id: v2.id } })).status,
    ).toBe("BORRADOR");
  });

  it("si el saldo deja de alcanzar entre el envío y la aprobación, la decisión se revierte", async () => {
    const f = await approvedCv([{ hours: "20" }]);
    const [bag] = await bagsOf(f.cv.id);
    const v2 = await newVersion(f.cv.id);
    await db.cvLine.update({
      where: { id: v2.lines[0].id },
      data: { quantity: "10" },
    });
    expect(await submit(v2.id)).toMatchObject({ ok: true });
    await consume(bag.id, 1000);
    await expect(approve(v2.id)).rejects.toBeInstanceOf(BagPlanError);
    expect(
      (await db.cvVersion.findUniqueOrThrow({ where: { id: v2.id } })).status,
    ).toBe("EN_APROBACION");
    expect(
      await db.cvApprovalRequest.count({
        where: { versionId: v2.id, status: "PENDIENTE" },
      }),
    ).toBe(1);
  });

  it("una bolsa vencida no acepta otras horas, pero se re-enlaza si no cambian", async () => {
    const f = await approvedCv([{ hours: "20" }]);
    const [bag] = await bagsOf(f.cv.id);
    await db.$transaction((tx) =>
      postHourMovement(tx, {
        bagId: bag.id,
        kind: "VENCIMIENTO",
        minutes: -1200,
        actorId: seller.id,
        endAs: "VENCIDA",
      }),
    );
    const v2 = await newVersion(f.cv.id);
    await db.cvLine.update({
      where: { id: v2.lines[0].id },
      data: { quantity: "25" },
    });
    expect(await submit(v2.id)).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
    await db.cvLine.update({
      where: { id: v2.lines[0].id },
      data: { quantity: "20" },
    });
    expect(await submit(v2.id)).toMatchObject({ ok: true });
    expect(await approve(v2.id)).toMatchObject({ ok: true });
    const [relinked] = await bagsOf(f.cv.id);
    expect(relinked).toMatchObject({
      status: "VENCIDA",
      cvLineId: v2.lines[0].id,
    });
  });

  it("rechaza al enviar un vencimiento que ya pasó", async () => {
    const f = await createCvFixture(db);
    await db.cv.update({
      where: { id: f.cv.id },
      data: { createdById: seller.id },
    });
    await addHourLines(f.version.id, [{ hours: "5", expiresOn: "2026-10-12" }]);
    expect(await submit(f.version.id)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  });

  it("anular sin consumos cierra las bolsas; con consumos no se puede anular", async () => {
    const free = await approvedCv([{ hours: "8" }]);
    const voided = await db.$transaction((tx) =>
      voidLatestVersion(
        tx,
        seller,
        { cvId: free.cv.id, reason: "Cliente desistió" },
        NOW,
      ),
    );
    expect(voided).toEqual({ ok: true, data: { cvVoided: true } });
    expect((await bagsOf(free.cv.id))[0]).toMatchObject({
      status: "CERRADA",
      balanceMinutes: 0,
    });

    const used = await approvedCv([{ hours: "8" }]);
    await consume((await bagsOf(used.cv.id))[0].id, 60);
    expect(
      await db.$transaction((tx) =>
        voidLatestVersion(
          tx,
          seller,
          { cvId: used.cv.id, reason: "Cliente desistió" },
          NOW,
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: "INVALID_STATE" } });
  });

  it("un CV de saldo inicial abre su bolsa con el motivo de migración", async () => {
    const f = await approvedCv([{ hours: "12.5" }], true);
    const [bag] = await bagsOf(f.cv.id);
    expect(bag.balanceMinutes).toBe(750);
    expect(bag.movements[0]).toMatchObject({ kind: "APERTURA", minutes: 750 });
    expect(bag.movements[0].reason).toMatch(/^Saldo inicial migrado · /);
  });
});
