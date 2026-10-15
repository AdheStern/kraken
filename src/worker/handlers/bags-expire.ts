// src/worker/handlers/bags-expire.ts
// bags.expire (AGENTS.md §7 jobs): a las 00:05 de La Paz vence las bolsas y emite los avisos de vencimiento.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { expireBags } from "@/server/hours/expire-bags";
import { log } from "@/server/log";
import type { JobDefinition } from "../job-registry";

export const bagsExpireJob: JobDefinition = {
  name: "bags.expire",
  cron: "5 0 * * *",
  run: async () => {
    const result = await expireBags(prisma, systemClock);
    log("info", "bolsas vencidas y avisadas", {
      job: "bags.expire",
      ...result,
    });
    return result;
  },
};
