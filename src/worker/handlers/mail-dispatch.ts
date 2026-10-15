// src/worker/handlers/mail-dispatch.ts
// mail.dispatch (AGENTS.md §7 jobs, ADR-08): cada minuto envía el outbox con el adaptador del entorno.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { log } from "@/server/log";
import { dispatchOutbox } from "@/server/mail/dispatch-outbox";
import { selectMailSender } from "@/server/mail/select-mail-sender";
import type { JobDefinition } from "../job-registry";

// POR QUÉ: se elige al cargar el worker; en producción sin Graph falla al arrancar, no al primer correo.
const sender = selectMailSender();

export const mailDispatchJob: JobDefinition = {
  name: "mail.dispatch",
  cron: "* * * * *",
  run: async () => {
    const result = await dispatchOutbox(prisma, sender, systemClock);
    if (result.sent + result.retried + result.failed > 0)
      log("info", "outbox procesado", {
        job: "mail.dispatch",
        via: sender.name,
        ...result,
      });
    return result;
  },
};
