// tests/integration/global-setup.ts
// Levanta PostgreSQL 16 en un contenedor, aplica las migraciones y comparte la URL con los tests.
import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const databaseUrl = container.getConnectionUri();

  // TRAMPA: prisma.config.ts carga .env, pero no pisa variables ya definidas; las del contenedor ganan.
  execSync("pnpm exec prisma migrate deploy", {
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: databaseUrl,
      DATABASE_URL: databaseUrl,
    },
    stdio: "pipe",
  });

  project.provide("databaseUrl", databaseUrl);
  return async () => {
    await container.stop();
  };
}
