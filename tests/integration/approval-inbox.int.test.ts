// tests/integration/approval-inbox.int.test.ts
// Bandeja de aprobaciones y de avisos contra la base (AGENTS.md §2.9 "CV: aprobar" y §5): cada gerente ve
// solo las solicitudes pendientes de sus áreas, el GG solo sobre el umbral, y cada usuario solo sus avisos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getInbox } from "@/features/notifications/queries/get-inbox";
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import type { SessionUser } from "@/server/authz/roles";
import { decideRequest } from "@/server/sales-control/decide-request";
import { submitVersion } from "@/server/sales-control/submit-version";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const NOW = new Date("2026-10-13T15:00:00Z");

let cvId: string;
let versionId: string;
let netManager: SessionUser;
let telManager: SessionUser;
let generalManager: SessionUser;
let seller: SessionUser;

beforeAll(async () => {
  const [net, tel] = await Promise.all(
    ["NET", "TEL"].map((code) =>
      db.area.create({
        data: { code: `${code}-${randomUUID().slice(0, 4)}`, name: code },
      }),
    ),
  );
  netManager = await createUserWithRoles(db, "Gerente NET", [
    { code: "GERENTE_AREA", areaId: net.id },
  ]);
  telManager = await createUserWithRoles(db, "Gerente TEL", [
    { code: "GERENTE_AREA", areaId: tel.id },
  ]);
  generalManager = await createUserWithRoles(db, "Gerencia General", [
    { code: "GERENTE_GENERAL" },
  ]);
  seller = await createUserWithRoles(db, "Comercial", [{ code: "COMERCIAL" }]);

  const f = await createCvFixture(db);
  cvId = f.cv.id;
  versionId = f.version.id;
  await db.cv.update({ where: { id: cvId }, data: { createdById: seller.id } });
  for (const [index, areaId] of [net.id, tel.id].entries()) {
    await db.cvLine.create({
      data: {
        versionId,
        position: index + 1,
        kind: "ITEM",
        areaId,
        description: `L${index}`,
        quantity: "1",
        unitCostUsd: "0",
        unitSaleUsd: "750",
        pricingSource: "PRECIO",
      },
    });
  }
  await db.cvVersion.update({
    where: { id: versionId },
    data: { totalSaleUsd: "1500.00" },
  });
  await db.$transaction((tx) =>
    submitVersion(tx, seller, versionId, {
      thresholdUsd: "50000.00",
      now: NOW,
    }),
  );
});

const pendingFor = async (user: SessionUser) =>
  (await listPendingApprovals(user)).filter((item) => item.cvId === cvId);

describe("bandeja de aprobaciones", () => {
  it("cada gerente ve su solicitud con monto, áreas y antigüedad", async () => {
    const [item] = await pendingFor(netManager);
    expect(item).toMatchObject({
      totalSaleUsd: "1500.00",
      versionNumber: 1,
      submittedAt: NOW.toISOString(),
    });
    expect(item.requestLabel).toMatch(/^Gerente NET-/);
    expect(item.areaCodes).toHaveLength(2);
    expect(await pendingFor(telManager)).toHaveLength(1);
  });

  it("el GG no la ve bajo el umbral y el comercial no tiene bandeja", async () => {
    expect(await pendingFor(generalManager)).toEqual([]);
    expect(await pendingFor(seller)).toEqual([]);
  });

  it("al decidir, sale de la bandeja de quien decidió y sigue en la del otro gerente", async () => {
    const [item] = await pendingFor(netManager);
    await db.$transaction((tx) =>
      decideRequest(
        tx,
        netManager,
        { requestId: item.requestId, decision: "APROBADA", comment: "" },
        NOW,
      ),
    );
    expect(await pendingFor(netManager)).toEqual([]);
    expect(await pendingFor(telManager)).toHaveLength(1);
  });
});

describe("bandeja de avisos", () => {
  it("cada usuario ve solo sus avisos, sin leer, con enlace a su bandeja", async () => {
    const inbox = await getInbox(telManager);
    const own = await db.inboxItem.count({ where: { userId: telManager.id } });
    expect(inbox.notices).toHaveLength(own);
    expect(inbox.unread).toBe(own);
    expect(inbox.notices[0].link).toBe("/aprobaciones");
  });
});
