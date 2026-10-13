// tests/integration/test-db.ts
// Cliente Prisma contra la base del contenedor y datos mínimos para armar un CV en los tests.
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { inject } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: inject("databaseUrl") }),
  });
}

const unique = () => randomUUID().slice(0, 8).toUpperCase();

export async function createCity(db: PrismaClient) {
  return db.city.create({ data: { code: unique(), name: "Ciudad de prueba" } });
}

export async function createCvFixture(db: PrismaClient) {
  const userId = randomUUID();
  await db.user.create({
    data: { id: userId, name: "Comercial", email: `${userId}@dima.test` },
  });
  await db.userProfile.create({ data: { userId } });
  const city = await createCity(db);
  const area = await db.area.create({ data: { code: unique(), name: "Área" } });
  const customer = await db.customer.create({
    data: { name: `Cliente ${unique()}` },
  });
  const cv = await db.cv.create({
    data: {
      number: 1,
      cityId: city.id,
      year: 2026,
      code: `001${city.code}-26`,
      customerId: customer.id,
      createdById: userId,
    },
  });
  const version = await createVersion(db, cv.id, userId, 1);
  return { userId, city, area, customer, cv, version };
}

export async function createVersion(
  db: PrismaClient,
  cvId: string,
  userId: string,
  number: number,
) {
  return db.cvVersion.create({
    data: {
      cvId,
      number,
      title: "Prueba",
      issuedOn: new Date("2026-10-13"),
      customerSnapshot: {},
      costFxRate: "6.97",
      saleFxRate: "6.96",
      createdById: userId,
    },
  });
}
