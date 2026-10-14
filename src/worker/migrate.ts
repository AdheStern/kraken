// src/worker/migrate.ts
// `pnpm worker:migrate`: instala o actualiza el esquema pgboss con el usuario de migraciones y da al usuario
// de la app solo permisos DML (ADR-07, §4: el usuario de la app no tiene DDL). Paso del despliegue.
import { readFileSync } from "node:fs";
import { PgBoss } from "pg-boss";

const SCHEMA = "pgboss";
const GRANTS_SQL = "deploy/sql/pgboss-grants.sql";

async function main() {
  const migrationUrl = process.env.MIGRATION_DATABASE_URL;
  const appUrl = process.env.DATABASE_URL;
  if (!migrationUrl || !appUrl)
    throw new Error("Define MIGRATION_DATABASE_URL y DATABASE_URL.");
  const boss = new PgBoss({
    connectionString: migrationUrl,
    schema: SCHEMA,
    migrate: true,
    supervise: false,
    schedule: false,
  });
  boss.on("error", (error) => console.error("[worker:migrate]", error));
  await boss.start();
  const appRole = decodeURIComponent(new URL(appUrl).username);
  const ownerRole = decodeURIComponent(new URL(migrationUrl).username);
  // POR QUÉ: en desarrollo ambas URL usan el mismo rol; darse permisos a sí mismo sobra.
  const needsGrants = appRole !== ownerRole;
  if (needsGrants) {
    const sql = readFileSync(GRANTS_SQL, "utf8").replaceAll(
      "{{app_role}}",
      `"${appRole.replaceAll('"', '""')}"`,
    );
    await boss.getDb().executeSql(sql);
  }
  await boss.stop({ graceful: false });
  console.log(
    `[worker:migrate] esquema ${SCHEMA} al día${needsGrants ? `; DML para ${appRole}` : ""}.`,
  );
}

main().catch((error: unknown) => {
  console.error("[worker:migrate] falló:", error);
  process.exit(1);
});
