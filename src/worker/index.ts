// src/worker/index.ts
// Proceso worker (ADR-07): arranca pg-boss, programa y atiende los jobs del registro y se detiene limpio.
// pg-boss evita la doble ejecución aunque corran dos workers (uno por nodo de app, §3).
import { PgBoss } from "pg-boss";
import { BUSINESS_TIME_ZONE } from "@/domain/calendar/business-date";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { JOBS } from "./job-registry";

// TRAMPA: en producción el usuario de la app no tiene DDL (§4): el esquema pgboss lo instala y actualiza
// `pnpm worker:migrate` en el despliegue, y el worker solo verifica su versión. En desarrollo migra solo.
const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === "production";

async function main() {
  if (!connectionString) throw new Error("Define DATABASE_URL para el worker.");
  const boss = new PgBoss({
    connectionString,
    schema: "pgboss",
    migrate: !isProduction,
    createSchema: !isProduction,
  });
  boss.on("error", (error) => log("error", "pg-boss", { error }));
  await boss.start();
  for (const job of JOBS) {
    await boss.createQueue(job.name);
    if (job.cron)
      await boss.schedule(job.name, job.cron, null, { tz: BUSINESS_TIME_ZONE });
    await boss.work(job.name, async () => {
      try {
        await job.run();
      } catch (error) {
        // POR QUÉ: se registra y se relanza; pg-boss reintenta y marca el job como fallido.
        log("error", "job falló", { job: job.name, error });
        throw error;
      }
    });
  }
  log("info", "worker listo", { jobs: JOBS.map((j) => j.name) });

  const stop = async () => {
    await boss.stop({ graceful: true });
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main().catch((error: unknown) => {
  log("error", "el worker no pudo arrancar", { error });
  process.exit(1);
});
