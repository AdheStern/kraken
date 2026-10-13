// prisma/seed/seed-super-admin.ts
// Crea o actualiza la cuenta de emergencia del administrador del sistema (email y contraseña)
// desde SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD. Idempotente: `pnpm db:seed:admin`.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/server/db";

const ROLE_CODE = "ADMIN_SISTEMA";
const ROLE_NAME = "Administrador del sistema";

async function main() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      "Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (mínimo 12 caracteres) en .env.",
    );
  }
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { id: randomUUID(), email, name: ROLE_NAME, emailVerified: true },
      update: { emailVerified: true },
    });
    const credential = await tx.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (credential) {
      await tx.account.update({
        where: { id: credential.id },
        data: { password: passwordHash },
      });
    } else {
      await tx.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }
    await tx.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: { isActive: true },
    });
    const role = await tx.role.upsert({
      where: { code: ROLE_CODE },
      create: { code: ROLE_CODE, name: ROLE_NAME },
      update: {},
    });
    // TRAMPA: la unicidad usa NULLS NOT DISTINCT (area_id null); Prisma no puede hacer upsert sobre ella.
    const assigned = await tx.userRole.findFirst({
      where: { userId: user.id, roleId: role.id, areaId: null },
    });
    if (!assigned) {
      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id, source: "MANUAL" },
      });
    }
  });
  console.log(`Administrador del sistema listo: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
