// prisma/seed/seed-dev.ts
// Carga idempotente de DESARROLLO (`pnpm db:seed:dev`): catálogos base + datos demo y usuarios. Nunca en producción.
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { seedBaseCatalogs } from "./base-catalogs";
import { upsertCredentialUser } from "./credential-user";
import * as data from "./dev-catalog-data";
import { seedDevContract } from "./dev-contracts";
import { seedDevDashboards } from "./dev-dashboards";
import { seedDevInventory } from "./dev-inventory";
import { seedDevTicketRequests } from "./dev-ticket-requests";
import { seedDevTickets } from "./dev-tickets";
import { seedCalendar } from "./seed-calendar";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:seed:dev no se ejecuta en producción.");
  }
  const password = process.env.DEV_SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Define DEV_SEED_PASSWORD (mínimo 12 caracteres) en .env.");
  }
  await prisma.$transaction(
    async (tx) => {
      await seedBaseCatalogs(tx);
      await seedDevCatalogs(tx);
      await seedCalendar(tx);
      for (const user of data.DEV_USERS) {
        const area =
          "areaCode" in user
            ? await tx.area.findUniqueOrThrow({
                where: { code: user.areaCode },
              })
            : null;
        await upsertCredentialUser(tx, { ...user, password, areaId: area?.id });
      }
      await seedDevTickets(tx, new Date());
      await seedDevTicketRequests(tx, new Date());
      await seedDevContract(tx, new Date());
      await seedDevInventory(tx, new Date());
      await seedDevDashboards(tx, new Date());
    },
    { timeout: 60_000 },
  );
  console.log(
    `Catálogos de desarrollo y ${data.DEV_USERS.length} usuarios listos.`,
  );
}

async function seedDevCatalogs(tx: Tx) {
  for (const name of data.DEV_TECHNOLOGIES) {
    const where = { name: { equals: name, mode: "insensitive" as const } };
    if (!(await tx.technology.findFirst({ where })))
      await tx.technology.create({ data: { name } });
  }
  for (const name of data.SUPPLIERS) {
    await tx.supplier.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const customer of data.CUSTOMERS) {
    const found = await tx.customer.findFirst({
      where: { name: customer.name },
    });
    if (!found)
      await tx.customer.create({ data: { ...customer, country: "Bolivia" } });
  }
  await seedProducts(tx);
}

async function seedProducts(tx: Tx) {
  for (const { technology, unit, ...product } of data.PRODUCTS) {
    if (await tx.product.findFirst({ where: { code: product.code } })) continue;
    const technologyRow = technology
      ? await tx.technology.findFirstOrThrow({
          where: { name: { equals: technology, mode: "insensitive" } },
        })
      : null;
    const unitRow = await tx.unit.findUniqueOrThrow({ where: { code: unit } });
    await tx.product.create({
      data: { ...product, technologyId: technologyRow?.id, unitId: unitRow.id },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
