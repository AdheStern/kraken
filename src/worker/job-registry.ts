// src/worker/job-registry.ts
// Registro de jobs del worker (patrón Registry, AGENTS.md §9): agregar un job no toca el motor que los corre.
import { bagsExpireJob } from "./handlers/bags-expire";
import { fxFetchOfficialJob } from "./handlers/fx-fetch-official";
import { mailDispatchJob } from "./handlers/mail-dispatch";

export type JobDefinition = {
  name: string;
  // Cron en America/La_Paz; sin cron, el job solo corre cuando alguien lo encola.
  cron?: string;
  run: () => Promise<unknown>;
};

export const JOBS: readonly JobDefinition[] = [
  bagsExpireJob,
  mailDispatchJob,
  fxFetchOfficialJob,
];
