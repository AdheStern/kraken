// tests/integration/cv-approval.int.test.ts
// Ciclo de aprobación contra la base (AGENTS.md §2.3 y APROB-01): envío, decisiones, observación,
// versión nueva, reemplazo, permisos, área sin gerente, concurrencia y anulación.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
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
const THRESHOLD = { thresholdUsd: "50000.00", now: NOW };

let net: { id: string };
let tel: { id: string };
let seller: SessionUser;
let netManager: SessionUser;
let telManager: SessionUser;
let generalManager: SessionUser;

beforeAll(async () => {
  net = await db.area.create({
    data: { code: `NET-${randomUUID().slice(0, 4)}`, name: "DIMANET" },
  });
  tel = await db.area.create({
    data: { code: `TEL-${randomUUID().slice(0, 4)}`, name: "DIMATEL" },
  });
  netManager = await createUserWithRoles(db, "Gerente NET", [
    { code: "GERENTE_AREA", areaId: net.id },
  ]);
  telManager = await createUserWithRoles(db, "Gerente TEL", [
    { code: "GERENTE_AREA", areaId: tel.id },
  ]);
  generalManager = await createUserWithRoles(db, "Gerencia General", [
    { code: "GERENTE_GENERAL" },
  ]);
});

async function cvWithLines(lines: { areaId: string; sale: string }[]) {
  const f = await createCvFixture(db);
  seller = await createUserWithRoles(db, "Comercial", [{ code: "COMERCIAL" }]);
  await db.cv.update({
    where: { id: f.cv.id },
    data: { createdById: seller.id },
  });
  for (const [index, line] of lines.entries()) {
    await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: index + 1,
        kind: "ITEM",
        areaId: line.areaId,
        description: `L${index}`,
        quantity: "1",
        unitCostUsd: "0",
        unitSaleUsd: line.sale,
        pricingSource: "PRECIO",
      },
    });
  }
  const total = lines.reduce((sum, l) => sum + Number(l.sale), 0).toFixed(2);
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { totalSaleUsd: total },
  });
  return f;
}

const submit = (user: SessionUser, versionId: string) =>
  db.$transaction((tx) => submitVersion(tx, user, versionId, THRESHOLD));
const decide = (
  user: SessionUser,
  requestId: string,
  decision: "APROBADA" | "RECHAZADA",
  comment = "",
) =>
  db.$transaction((tx) =>
    decideRequest(tx, user, { requestId, decision, comment }, NOW),
  );
const requestFor = async (versionId: string, areaId: string | null) =>
  (
    await db.cvApprovalRequest.findFirstOrThrow({
      where: { versionId, areaId },
    })
  ).id;
const statusOf = async (versionId: string) =>
  (await db.cvVersion.findUniqueOrThrow({ where: { id: versionId } })).status;

describe("APROB-01 contra la base", () => {
  it("v1 observada por DIMATEL; v2 sin GG aprobada; v3 reemplaza a v2", async () => {
    const f = await cvWithLines([
      { areaId: net.id, sale: "38000" },
      { areaId: tel.id, sale: "24500" },
    ]);
    expect(await submit(seller, f.version.id)).toEqual({
      ok: true,
      data: { requests: 3 },
    });
    expect(
      await db.inboxItem.count({
        where: {
          userId: { in: [netManager.id, telManager.id, generalManager.id] },
          eventType: "CV_ENVIADO",
        },
      }),
    ).toBeGreaterThanOrEqual(3);
    expect(
      (
        await db.cvVersion.findUniqueOrThrow({ where: { id: f.version.id } })
      ).approvalThresholdUsd?.toFixed(2),
    ).toBe("50000.00");

    await decide(
      netManager,
      await requestFor(f.version.id, net.id),
      "APROBADA",
    );
    await decide(
      generalManager,
      await requestFor(f.version.id, null),
      "APROBADA",
    );
    expect(
      await decide(
        telManager,
        await requestFor(f.version.id, tel.id),
        "RECHAZADA",
      ),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(
      await decide(
        telManager,
        await requestFor(f.version.id, tel.id),
        "RECHAZADA",
        "Ajustar precio de licencias",
      ),
    ).toEqual({ ok: true, data: { round: "OBSERVADA" } });
    expect(await statusOf(f.version.id)).toBe("OBSERVADA");

    const v2 = await db.$transaction((tx) =>
      startNewVersion(tx, seller, {
        cvId: f.cv.id,
        reason: "Corrección de DIMATEL",
      }),
    );
    expect(v2).toEqual({ ok: true, data: { versionNumber: 2 } });
    const version2 = await db.cvVersion.findFirstOrThrow({
      where: { cvId: f.cv.id, number: 2 },
      include: { lines: true },
    });
    const telLine = version2.lines.find((l) => l.areaId === tel.id);
    await db.cvLine.update({
      where: { id: telLine?.id },
      data: { unitSaleUsd: "10000" },
    });
    await db.cvVersion.update({
      where: { id: version2.id },
      data: { totalSaleUsd: "48000.00" },
    });

    expect(await submit(seller, version2.id)).toEqual({
      ok: true,
      data: { requests: 2 },
    });
    await decide(netManager, await requestFor(version2.id, net.id), "APROBADA");
    expect(
      await decide(
        telManager,
        await requestFor(version2.id, tel.id),
        "APROBADA",
      ),
    ).toEqual({ ok: true, data: { round: "APROBADA" } });
    expect(await statusOf(version2.id)).toBe("APROBADA");
    expect(await statusOf(f.version.id)).toBe("OBSERVADA");

    await db.$transaction((tx) =>
      startNewVersion(tx, seller, {
        cvId: f.cv.id,
        reason: "Ampliación de alcance",
      }),
    );
    const version3 = await db.cvVersion.findFirstOrThrow({
      where: { cvId: f.cv.id, number: 3 },
    });
    expect(await statusOf(version2.id)).toBe("APROBADA");
    await submit(seller, version3.id);
    await decide(netManager, await requestFor(version3.id, net.id), "APROBADA");
    await decide(telManager, await requestFor(version3.id, tel.id), "APROBADA");
    expect(await statusOf(version3.id)).toBe("APROBADA");
    expect(await statusOf(version2.id)).toBe("REEMPLAZADA");
  });
});

describe("reglas del ciclo", () => {
  it("un gerente de otra área no decide y una solicitud decidida no se repite", async () => {
    const f = await cvWithLines([{ areaId: net.id, sale: "100" }]);
    await submit(seller, f.version.id);
    const request = await requestFor(f.version.id, net.id);
    expect(await decide(telManager, request, "APROBADA")).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    await decide(netManager, request, "APROBADA");
    expect(await decide(netManager, request, "APROBADA")).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
  });

  it("no se envía si un área no tiene gerente ni si la versión no tiene líneas", async () => {
    const orphan = await db.area.create({
      data: { code: `SIN-${randomUUID().slice(0, 4)}`, name: "Sin gerente" },
    });
    const f = await cvWithLines([{ areaId: orphan.id, sale: "100" }]);
    expect(await submit(seller, f.version.id)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
    const empty = await cvWithLines([]);
    expect(await submit(seller, empty.version.id)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  });

  it("dos aprobaciones simultáneas terminan en una sola APROBADA", async () => {
    const f = await cvWithLines([
      { areaId: net.id, sale: "100" },
      { areaId: tel.id, sale: "100" },
    ]);
    await submit(seller, f.version.id);
    const results = await Promise.all([
      decide(netManager, await requestFor(f.version.id, net.id), "APROBADA"),
      decide(telManager, await requestFor(f.version.id, tel.id), "APROBADA"),
    ]);
    expect(results.map((r) => r.ok && r.data.round).sort()).toEqual([
      "APROBADA",
      "EN_CURSO",
    ]);
    expect(await statusOf(f.version.id)).toBe("APROBADA");
  });

  it("anular una aprobada sin consumos anula el CV", async () => {
    const f = await cvWithLines([{ areaId: net.id, sale: "100" }]);
    await submit(seller, f.version.id);
    await decide(
      netManager,
      await requestFor(f.version.id, net.id),
      "APROBADA",
    );
    const result = await db.$transaction((tx) =>
      voidLatestVersion(
        tx,
        seller,
        { cvId: f.cv.id, reason: "Cliente desistió" },
        NOW,
      ),
    );
    expect(result).toEqual({ ok: true, data: { cvVoided: true } });
    expect(
      (await db.cv.findUniqueOrThrow({ where: { id: f.cv.id } })).voidReason,
    ).toBe("Cliente desistió");
  });
});
