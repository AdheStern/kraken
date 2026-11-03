// tests/integration/customer-accounts.int.test.ts
// Cuentas del portal de clientes (AGENTS.md §2.11): alta con contraseña ligada a la empresa y su
// configuración; edición de la configuración y de la contraseña, que cierra sus sesiones.
import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCustomerAccount } from "@/server/customer-portal/create-customer-account";
import { updateCustomerAccount } from "@/server/customer-portal/update-customer-account";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
// POR QUÉ: en producción el rol lo crea `db:seed:base` en cada despliegue; la base de pruebas parte vacía.
beforeAll(() =>
  db.role.upsert({
    where: { code: "CLIENTE" },
    create: { code: "CLIENTE", name: "Cliente (portal)" },
    update: {},
  }),
);

async function newAccount() {
  const customer = await db.customer.create({
    data: { name: `Cliente ${randomUUID()}` },
  });
  const email = `soporte-${randomUUID()}@cliente.test`;
  const result = await db.$transaction((tx) =>
    createCustomerAccount(tx, {
      customerId: customer.id,
      name: "Soporte ACME",
      email,
      password: "contraseña-segura-1",
      seesBags: true,
      requestsWork: false,
      comments: true,
    }),
  );
  if ("conflict" in result) throw new Error(result.conflict);
  return { customer, email, userId: result.userId };
}

describe("createCustomerAccount", () => {
  it("crea la cuenta con contraseña, rol CLIENTE y la configuración del cliente", async () => {
    const { customer, userId } = await newAccount();
    const profile = await db.userProfile.findUniqueOrThrow({
      where: { userId },
      include: { roles: { include: { role: true } }, customer: true },
    });
    expect(profile.customerId).toBe(customer.id);
    expect(profile.roles.map((r) => r.role.code)).toEqual(["CLIENTE"]);
    expect(profile.customer).toMatchObject({
      portalSeesBags: true,
      portalRequests: false,
      portalComments: true,
    });
    const account = await db.account.findFirstOrThrow({
      where: { userId, providerId: "credential" },
    });
    expect(
      await verifyPassword({
        hash: account.password ?? "",
        password: "contraseña-segura-1",
      }),
    ).toBe(true);
  });

  it("rechaza un correo repetido", async () => {
    const { customer, email } = await newAccount();
    const result = await db.$transaction((tx) =>
      createCustomerAccount(tx, {
        customerId: customer.id,
        name: "Otra",
        email,
        password: "contraseña-segura-2",
        seesBags: false,
        requestsWork: false,
        comments: false,
      }),
    );
    expect(result).toEqual({ conflict: "Ya hay una cuenta con ese correo." });
  });
});

describe("updateCustomerAccount", () => {
  it("cambia la configuración y la contraseña, y cierra sus sesiones", async () => {
    const { customer, userId } = await newAccount();
    await db.session.create({
      data: {
        id: randomUUID(),
        userId,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    await db.$transaction((tx) =>
      updateCustomerAccount(tx, {
        userId,
        password: "otra-contraseña-larga",
        seesBags: false,
        requestsWork: true,
        comments: false,
      }),
    );
    expect(
      await db.customer.findUniqueOrThrow({ where: { id: customer.id } }),
    ).toMatchObject({
      portalSeesBags: false,
      portalRequests: true,
      portalComments: false,
    });
    expect(await db.session.count({ where: { userId } })).toBe(0);
  });

  it("no toca a un usuario interno", async () => {
    const userId = randomUUID();
    await db.user.create({
      data: { id: userId, name: "Ingeniero", email: `${userId}@dima.test` },
    });
    await db.userProfile.create({ data: { userId } });
    const result = await db.$transaction((tx) =>
      updateCustomerAccount(tx, {
        userId,
        password: "",
        seesBags: true,
        requestsWork: true,
        comments: true,
      }),
    );
    expect(result).toBeNull();
  });
});
