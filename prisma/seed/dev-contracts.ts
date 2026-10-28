// prisma/seed/dev-contracts.ts
// SOLO desarrollo: un CV aprobado con un contrato de soporte anual por vigencia, sin tope, para «Minera Illimani»
// (AGENTS.md §2.4); se abre con applyVersionBags, como en una aprobación real.
import {
  toBusinessDate,
  toBusinessYear,
} from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import type { Tx } from "@/server/db";
import { applyVersionBags } from "@/server/hours/apply-version-bags";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";

const CUSTOMER = "Minera Illimani S.A. (demo)";
const DAY_MS = 86_400_000;

export async function seedDevContract(tx: Tx, now: Date): Promise<number> {
  const customer = await tx.customer.findFirstOrThrow({
    where: { name: CUSTOMER },
  });
  const existing = await tx.hourBag.count({
    where: { customerId: customer.id, kind: "VIGENCIA" },
  });
  if (existing > 0) return 0;
  const city = await tx.city.findUniqueOrThrow({ where: { code: "LP" } });
  const area = await tx.area.findUniqueOrThrow({ where: { code: "DIMAHELP" } });
  const years = await tx.unit.findUniqueOrThrow({ where: { code: "AÑOS" } });
  const seller = await tx.user.findUniqueOrThrow({
    where: { email: "comercial@dima.local" },
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
      createdById: seller.id,
    },
  });
  const version = await tx.cvVersion.create({
    data: {
      cvId: cv.id,
      number: 1,
      title: "Soporte anual por vigencia (demo)",
      issuedOn: now,
      customerSnapshot: {},
      costFxRate: "6.96",
      saleFxRate: "6.96",
      createdById: seller.id,
      totalSaleUsd: "4800.00",
      sellers: { create: { userId: seller.id } },
    },
  });
  const [y, m] = toBusinessDate(now).split("-").map(Number);
  await tx.cvLine.create({
    data: {
      versionId: version.id,
      position: 1,
      kind: "ITEM",
      areaId: area.id,
      itemType: "SERVICIO",
      unitId: years.id,
      description: "Soporte técnico anual 8x5 (sin tope de horas)",
      quantity: "1",
      unitCostUsd: "0",
      unitSaleUsd: "4800.00",
      pricingSource: "PRECIO",
      coverageStart: new Date(Date.UTC(y, m - 1, 1)),
      coverageEnd: new Date(Date.UTC(y + 1, m - 1, 1) - DAY_MS),
      hourBagSpec: {
        kind: "VIGENCIA",
        capHours: null,
        modality: "H8X5",
        scope: "AREA",
        areaIds: [area.id],
        projectId: null,
        expiresOn: "",
      },
    },
  });
  await tx.cvVersion.update({
    where: { id: version.id },
    data: { status: "APROBADA", submittedAt: now, approvedAt: now },
  });
  await applyVersionBags(tx, {
    cvId: cv.id,
    versionId: version.id,
    actorId: seller.id,
    label: code,
    reason: null,
  });
  return 1;
}
