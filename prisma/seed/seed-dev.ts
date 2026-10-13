// prisma/seed/seed-dev.ts
// Carga idempotente de catálogos y usuarios de DESARROLLO (`pnpm db:seed:dev`). Nunca en producción.
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { upsertCredentialUser } from "./credential-user";
import * as data from "./dev-catalog-data";
import { upsertRoles } from "./roles";

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
      await upsertRoles(tx);
      await seedCatalogs(tx);
      for (const user of data.DEV_USERS) {
        const area =
          "areaCode" in user
            ? await tx.area.findUniqueOrThrow({
                where: { code: user.areaCode },
              })
            : null;
        await upsertCredentialUser(tx, { ...user, password, areaId: area?.id });
      }
    },
    { timeout: 60_000 },
  );
  console.log(
    `Catálogos de desarrollo y ${data.DEV_USERS.length} usuarios listos.`,
  );
}

async function seedCatalogs(tx: Tx) {
  for (const city of data.CITIES) {
    await tx.city.upsert({
      where: { code: city.code },
      create: city,
      update: { name: city.name },
    });
  }
  for (const area of data.AREAS) {
    await tx.area.upsert({
      where: { code: area.code },
      create: area,
      update: { name: area.name },
    });
  }
  for (const unit of data.UNITS) {
    await tx.unit.upsert({
      where: { code: unit.code },
      create: unit,
      update: unit,
    });
  }
  for (const name of data.TECHNOLOGIES) {
    await tx.technology.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  for (const name of data.SUPPLIERS) {
    await tx.supplier.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of data.SERVICE_TYPES) {
    await tx.serviceType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  for (const customer of data.CUSTOMERS) {
    const found = await tx.customer.findFirst({
      where: { name: customer.name },
    });
    if (!found)
      await tx.customer.create({ data: { ...customer, country: "Bolivia" } });
  }
  for (const parameter of data.PARAMETERS) {
    await tx.parameter.upsert({
      where: { key: parameter.key },
      create: parameter,
      update: {},
    });
  }
  await seedProducts(tx);
}

async function seedProducts(tx: Tx) {
  for (const { technology, unit, ...product } of data.PRODUCTS) {
    if (await tx.product.findFirst({ where: { code: product.code } })) continue;
    const technologyRow = technology
      ? await tx.technology.findUniqueOrThrow({ where: { name: technology } })
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
