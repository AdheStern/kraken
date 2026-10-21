// prisma/seed/dev-inventory.ts
// Inventario de DEMOSTRACIÓN (solo db:seed:dev): stock inicial en La Paz y Santa Cruz con seriales y un CV con
// stock de DIMA aprobado que ya reservó. Usa los caminos reales (registerReceipt, applyVersionReservations).
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { toBusinessYear } from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import type { Tx } from "@/server/db";
import { applyVersionReservations } from "@/server/inventory/apply-version-reservations";
import { registerReceipt } from "@/server/inventory/register-receipt";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";

const line = (
  code: string,
  quantity: number,
  cost: string,
  serials: string[] = [],
) => ({
  code,
  description: "",
  quantity: new Decimal(quantity),
  unitCostUsd: new Decimal(cost),
  serials,
});

// POR QUÉ: idempotente; si ya hay movimientos de inventario, la demo ya se cargó (o hay datos reales).
export async function seedDevInventory(tx: Tx, now: Date): Promise<number> {
  if ((await tx.invMovement.count()) > 0) return 0;
  const keeper = await tx.user.findUniqueOrThrow({
    where: { email: "almacen@dima.local" },
  });
  const commercial = await tx.user.findUniqueOrThrow({
    where: { email: "comercial@dima.local" },
  });
  const lp = await tx.warehouse.findUniqueOrThrow({ where: { code: "LP" } });
  const sc = await tx.warehouse.findUniqueOrThrow({ where: { code: "SC" } });
  const receipt = (warehouseId: string, lines: ReturnType<typeof line>[]) =>
    registerReceipt(tx, keeper.id, {
      warehouseId,
      origin: "INVENTARIO_INICIAL",
      documentRef: "Inventario inicial (demo)",
      notes: null,
      idempotencyKey: randomUUID(),
      lines,
    });
  await receipt(lp.id, [
    line("C9300-48P-E", 3, "3375.90", ["FOC2701A1", "FOC2701A2", "FOC2701A3"]),
    line("FG-100F", 2, "2890.00", ["FG100F0001", "FG100F0002"]),
    line("CAB-UTP-CAT6", 12, "118.40"),
  ]);
  await receipt(sc.id, [
    line("S5735-L48T4X", 2, "1450.00", ["21980SC0001", "21980SC0002"]),
    line("CAB-UTP-CAT6", 4, "121.00"),
  ]);
  await seedStockCv(tx, { commercialId: commercial.id, now });
  return 2;
}

// Un CV de La Paz con un FortiGate desde stock, aprobado: su reserva aparece en el POS y en el stock.
async function seedStockCv(
  tx: Tx,
  { commercialId, now }: { commercialId: string; now: Date },
) {
  const city = await tx.city.findUniqueOrThrow({ where: { code: "LP" } });
  const customer = await tx.customer.findFirstOrThrow({
    where: { name: "Minera Illimani S.A. (demo)" },
  });
  const area = await tx.area.findUniqueOrThrow({ where: { code: "DIMANET" } });
  const product = await tx.product.findFirstOrThrow({
    where: { code: "FG-100F" },
  });
  const year = toBusinessYear(now);
  const number = await allocateCvNumber(tx, city.id, year);
  const code = toCvCode({ number, cityCode: city.code, year });
  const cv = await tx.cv.create({
    data: {
      number,
      cityId: city.id,
      year,
      code,
      customerId: customer.id,
      createdById: commercialId,
    },
  });
  const version = await tx.cvVersion.create({
    data: {
      cvId: cv.id,
      number: 1,
      title: "Firewall perimetral desde stock (demo)",
      issuedOn: now,
      customerSnapshot: {},
      costFxRate: "6.96",
      saleFxRate: "6.96",
      createdById: commercialId,
      sellers: { create: { userId: commercialId } },
    },
  });
  await tx.cvLine.create({
    data: {
      versionId: version.id,
      position: 1,
      kind: "ITEM",
      areaId: area.id,
      itemType: "HARDWARE",
      productId: product.id,
      supplyMode: "STOCK_DIMA",
      code: product.code,
      description: product.description,
      quantity: "1",
      unitCostUsd: "2890.00",
      unitSaleUsd: "3900.00",
      pricingSource: "PRECIO",
    },
  });
  await tx.cvVersion.update({
    where: { id: version.id },
    data: {
      status: "APROBADA",
      submittedAt: now,
      approvedAt: now,
      totalCostUsd: "2890.00",
      totalSaleUsd: "3900.00",
    },
  });
  await applyVersionReservations(tx, {
    cvId: cv.id,
    versionId: version.id,
    actorId: commercialId,
    label: code,
  });
}
