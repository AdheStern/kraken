// src/worker/handlers/sla-evaluate.ts
// sla.evaluate (AGENTS.md §7 jobs): cada 5 min recalcula el SLA de los tickets abiertos y avisa al 75 %.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { evaluateSla } from "@/server/sla/evaluate-sla";
import type { JobDefinition } from "../job-registry";

export const slaEvaluateJob: JobDefinition = {
  name: "sla.evaluate",
  cron: "*/5 * * * *",
  run: async () => {
    const result = await evaluateSla(prisma, systemClock);
    log("info", "SLA evaluado", { job: "sla.evaluate", ...result });
    return result;
  },
};
