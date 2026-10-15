// src/worker/handlers/fx-fetch-official.ts
// fx.fetch-official (AGENTS.md §7 jobs, ADR-09): cada hora, a los 15 min, trae el TC oficial si falta el de hoy.
// El primer intento del día cae a las 00:15 de La Paz.
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { CucuFxRateProvider } from "@/server/fx/cucu-fx-rate-provider";
import { fetchOfficialFx } from "@/server/fx/fetch-official-fx";
import { log } from "@/server/log";
import type { JobDefinition } from "../job-registry";

const DEFAULT_URL = "https://apibcb.cucu.bo/api/v1/tc/oficial";
const provider = new CucuFxRateProvider(process.env.FX_API_URL || DEFAULT_URL);

export const fxFetchOfficialJob: JobDefinition = {
  name: "fx.fetch-official",
  cron: "15 * * * *",
  run: async () => {
    const result = await fetchOfficialFx(prisma, provider, systemClock);
    if (result.status === "guardado")
      log(result.hasToday ? "info" : "warn", "TC oficial guardado", {
        job: "fx.fetch-official",
        ...result,
      });
    return result;
  },
};
