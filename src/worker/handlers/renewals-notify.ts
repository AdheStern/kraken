// src/worker/handlers/renewals-notify.ts
// renewals.notify (AGENTS.md §7 jobs): a las 07:00 de La Paz avisa las vigencias de los CV que están por vencer.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { notifyRenewals } from "@/server/sales-control/notify-renewals";
import type { JobDefinition } from "../job-registry";

export const renewalsNotifyJob: JobDefinition = {
  name: "renewals.notify",
  cron: "0 7 * * *",
  run: async () => {
    const result = await notifyRenewals(prisma, systemClock);
    log("info", "renovaciones avisadas", { job: "renewals.notify", ...result });
    return result;
  },
};
