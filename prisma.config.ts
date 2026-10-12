// prisma.config.ts
// Configuración del CLI de Prisma: esquema multiarchivo, migraciones y URL del usuario de migraciones.
import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

// POR QUÉ: Prisma 7 ya no carga .env; en CI las variables llegan por el entorno y no hay archivo.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema",
  migrations: { path: "prisma/migrations" },
  // REGLA: las migraciones corren con un usuario con DDL distinto al de la app (AGENTS.md §4, §10).
  datasource: { url: env("MIGRATION_DATABASE_URL") },
});
