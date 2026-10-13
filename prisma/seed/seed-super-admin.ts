// prisma/seed/seed-super-admin.ts
// Crea o actualiza la cuenta de emergencia del administrador del sistema (email y contraseña)
// desde SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD. Idempotente: `pnpm db:seed:admin`.
import { prisma } from "@/server/db";
import { upsertCredentialUser } from "./credential-user";
import { upsertRoles } from "./roles";

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      "Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (mínimo 12 caracteres) en .env.",
    );
  }
  await prisma.$transaction(async (tx) => {
    await upsertRoles(tx);
    await upsertCredentialUser(tx, {
      email,
      password,
      name: "Administrador del sistema",
      role: "ADMIN_SISTEMA",
    });
  });
  console.log(`Administrador del sistema listo: ${email.trim().toLowerCase()}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
