// src/worker/index.ts
// Proceso worker (ADR-07): arranca pg-boss, programa y atiende los jobs del registro y se detiene limpio.
// pg-boss evita la doble ejecución aunque corran dos workers (uno por nodo de app, §3).
import { PgBoss } from "pg-boss";
import { BUSINESS_TIME_ZONE } from "@/domain/calendar/business-date";
import { prisma } from "@/server/db";
import { JOBS } from "./job-registry";

// TRAMPA: pg-boss crea su esquema "pgboss" al arrancar; en producción el usuario de la app no tiene DDL (§4),
// así que ese esquema se crea en el despliegue con el usuario de migraciones antes del primer arranque.
const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString) throw new Error("Define DATABASE_URL para el worker.");
  const boss = new PgBoss({ connectionString, schema: "pgboss" });
  boss.on("error", (error) => console.error("[worker]", error));
  await boss.start();
  for (const job of JOBS) {
    await boss.createQueue(job.name);
    if (job.cron)
      await boss.schedule(job.name, job.cron, null, { tz: BUSINESS_TIME_ZONE });
    await boss.work(job.name, async () => {
      await job.run();
    });
  }
  console.log(`[worker] listo: ${JOBS.map((j) => j.name).join(", ")}`);

  const stop = async () => {
    await boss.stop({ graceful: true });
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main().catch((error: unknown) => {
  console.error("[worker] no pudo arrancar:", error);
  process.exit(1);
});
