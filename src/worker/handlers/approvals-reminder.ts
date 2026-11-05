// src/worker/handlers/approvals-reminder.ts
// approvals.reminder (AGENTS.md §7 jobs): a las 09:00 de lunes a viernes recuerda las aprobaciones pendientes.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { remindApprovals } from "@/server/sales-control/remind-approvals";
import type { JobDefinition } from "../job-registry";

export const approvalsReminderJob: JobDefinition = {
  name: "approvals.reminder",
  cron: "0 9 * * 1-5",
  run: async () => {
    const result = await remindApprovals(prisma, systemClock);
    log("info", "aprobaciones pendientes recordadas", {
      job: "approvals.reminder",
      ...result,
    });
    return result;
  },
};
