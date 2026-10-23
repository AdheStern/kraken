// prisma/seed/dev-dashboards.ts
// Ventas de DEMOSTRACIÓN para los tableros (solo db:seed:dev): CV aprobados a lo largo de 12 meses en varias
// áreas, ciudades, clientes, tecnologías y vendedores, con servicios propios, vigencias por renovar y metas.
import { toBusinessYear } from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import type { Tx } from "@/server/db";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";
import { DEMO_SALES, type DemoSpec } from "./dev-dashboards-data";

const DAY_MS = 86_400_000;
const TITLE = "(demo tablero)";

// POR QUÉ: idempotente; si ya están los CV demo del tablero, no se vuelven a crear.
export async function seedDevDashboards(tx: Tx, now: Date): Promise<number> {
  await setEngineerCity(tx);
  if (await tx.cvVersion.findFirst({ where: { title: { endsWith: TITLE } } }))
    return 0;
  const ana = await tx.user.findUniqueOrThrow({
    where: { email: "comercial@dima.local" },
  });
  const bruno = await tx.user.findUniqueOrThrow({
    where: { email: "comercial2@dima.local" },
  });
  const sellers = { ana: ana.id, bruno: bruno.id };
  const customers = await tx.customer.findMany({
    where: { name: { endsWith: "(demo)" } },
    orderBy: { taxId: "asc" },
  });
  for (const spec of DEMO_SALES) {
    const approvedAt = new Date(
      now.getTime() - (spec.monthsAgo * 30 + 2) * DAY_MS,
    );
    await seedApprovedCv(tx, spec, {
      approvedAt,
      now,
      sellerIds: spec.sellers.map((s) => sellers[s]),
      customerId: customers[spec.customer].id,
    });
  }
  await seedGoals(tx, now, ana.id);
  return DEMO_SALES.length;
}

type Context = {
  approvedAt: Date;
  now: Date;
  sellerIds: string[];
  customerId: string;
};

async function seedApprovedCv(tx: Tx, spec: DemoSpec, ctx: Context) {
  const city = await tx.city.findUniqueOrThrow({ where: { code: spec.city } });
  const year = toBusinessYear(ctx.approvedAt);
  const number = await allocateCvNumber(tx, city.id, year);
  const cv = await tx.cv.create({
    data: {
      number,
      cityId: city.id,
      year,
      code: toCvCode({ number, cityCode: city.code, year }),
      customerId: ctx.customerId,
      createdById: ctx.sellerIds[0],
    },
  });
  const version = await tx.cvVersion.create({
    data: {
      cvId: cv.id,
      number: 1,
      title: `Proyecto ${spec.lines[0].tech} ${TITLE}`,
      issuedOn: ctx.approvedAt,
      customerSnapshot: {},
      costFxRate: "6.96",
      saleFxRate: "6.96",
      createdById: ctx.sellerIds[0],
      sellers: { create: ctx.sellerIds.map((userId) => ({ userId })) },
    },
  });
  for (const [i, line] of spec.lines.entries()) {
    const [area, tech] = await Promise.all([
      tx.area.findUniqueOrThrow({ where: { code: line.area } }),
      tx.technology.findFirstOrThrow({
        where: { name: { equals: line.tech, mode: "insensitive" } },
      }),
    ]);
    await tx.cvLine.create({
      data: {
        versionId: version.id,
        position: i + 1,
        kind: "ITEM",
        areaId: area.id,
        technologyId: tech.id,
        itemType: line.cost === "0" ? "SERVICIO" : "INTANGIBLE",
        supplyMode: line.cost === "0" ? "SERVICIO_PROPIO" : "LOCAL",
        description:
          line.cost === "0"
            ? "Servicios conexos de implementación"
            : `Suscripción ${line.tech} 12 meses`,
        quantity: "1",
        unitCostUsd: line.cost,
        unitSaleUsd: line.sale,
        pricingSource: "PRECIO",
        coverageEnd: line.coverageDays
          ? new Date(ctx.now.getTime() + line.coverageDays * DAY_MS)
          : null,
      },
    });
  }
  const sum = (key: "cost" | "sale") =>
    spec.lines.reduce((acc, l) => acc + Number(l[key]), 0).toFixed(2);
  await tx.cvVersion.update({
    where: { id: version.id },
    data: {
      status: "APROBADA",
      submittedAt: new Date(
        ctx.approvedAt.getTime() - (spec.monthsAgo + 3) * 3_600_000,
      ),
      approvedAt: ctx.approvedAt,
      totalCostUsd: sum("cost"),
      totalSaleUsd: sum("sale"),
    },
  });
}

// POR QUÉ: la utilización se mide contra el calendario de la ciudad del ingeniero; sin ciudad no hay porcentaje.
async function setEngineerCity(tx: Tx) {
  const lp = await tx.city.findUniqueOrThrow({ where: { code: "LP" } });
  const users = await tx.user.findMany({
    where: { email: { in: ["ingeniero@dima.local", "ingeniero2@dima.local"] } },
  });
  await tx.userProfile.updateMany({
    where: { userId: { in: users.map((u) => u.id) }, cityId: null },
    data: { cityId: lp.id },
  });
}

// Metas de la empresa y de DIMANET para cada mes del año en curso.
async function seedGoals(tx: Tx, now: Date, actorId: string) {
  const year = toBusinessYear(now);
  const net = await tx.area.findUniqueOrThrow({ where: { code: "DIMANET" } });
  for (let month = 1; month <= 12; month++) {
    for (const [areaId, valueUsd] of [
      [null, "30000.00"],
      [net.id, "18000.00"],
    ] as const) {
      if (
        await tx.goal.findFirst({
          where: { areaId, indicator: "VENTAS_USD", year, month },
        })
      )
        continue;
      await tx.goal.create({
        data: {
          areaId,
          indicator: "VENTAS_USD",
          year,
          month,
          valueUsd,
          updatedById: actorId,
        },
      });
    }
  }
}
