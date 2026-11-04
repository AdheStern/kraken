// src/worker/handlers/security-watch.ts
// security.watch (AGENTS.md §7 jobs): cada 5 min avisa de intentos fallidos repetidos y del uso de la cuenta de
// emergencia (ISO 27001 A.8.16).
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { watchSecurityEvents } from "@/server/security/watch-security-events";
import type { JobDefinition } from "../job-registry";

export const securityWatchJob: JobDefinition = {
  name: "security.watch",
  cron: "*/5 * * * *",
  run: async () => {
    const result = await watchSecurityEvents(prisma, systemClock);
    log("info", "eventos de seguridad revisados", {
      job: "security.watch",
      ...result,
    });
    return result;
  },
};
