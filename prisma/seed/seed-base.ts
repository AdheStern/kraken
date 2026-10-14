// prisma/seed/seed-base.ts
// Carga inicial de catálogos base (`pnpm db:seed:base`), apta para producción y repetible sin efectos.
import { prisma } from "@/server/db";
import { seedBaseCatalogs } from "./base-catalogs";

async function main() {
  const created = await prisma.$transaction((tx) => seedBaseCatalogs(tx), {
    timeout: 60_000,
  });
  console.log(
    created === 0
      ? "Catálogos base al día; no faltaba nada."
      : `Catálogos base: ${created} registros nuevos.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
