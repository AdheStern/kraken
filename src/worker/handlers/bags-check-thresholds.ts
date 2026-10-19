// src/worker/handlers/bags-check-thresholds.ts
// bags.check-thresholds (AGENTS.md §7 jobs): cada 30 min avisa de los tickets abiertos cuyo consumo proyectado
// supera el saldo de sus bolsas.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { warnProjectedOverrun } from "@/server/tickets/warn-projected-overrun";
import type { JobDefinition } from "../job-registry";

export const bagsCheckThresholdsJob: JobDefinition = {
  name: "bags.check-thresholds",
  cron: "*/30 * * * *",
  run: async () => {
    const result = await warnProjectedOverrun(prisma, systemClock);
    log("info", "proyecciones de bolsas revisadas", {
      job: "bags.check-thresholds",
      ...result,
    });
    return result;
  },
};
