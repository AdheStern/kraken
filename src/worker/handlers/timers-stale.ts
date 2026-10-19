// src/worker/handlers/timers-stale.ts
// timers.stale (AGENTS.md §7 jobs): cada 30 min avisa de los contadores abiertos más de 10 h.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { warnStaleTimers } from "@/server/tickets/warn-stale-timers";
import type { JobDefinition } from "../job-registry";

export const timersStaleJob: JobDefinition = {
  name: "timers.stale",
  cron: "*/30 * * * *",
  run: async () => {
    const result = await warnStaleTimers(prisma, systemClock);
    log("info", "contadores olvidados avisados", {
      job: "timers.stale",
      ...result,
    });
    return result;
  },
};
