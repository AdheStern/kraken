// src/worker/job-registry.ts
// Registro de jobs del worker (patrón Registry, AGENTS.md §9): agregar un job no toca el motor que los corre.
import { bagsExpireJob } from "./handlers/bags-expire";

export type JobDefinition = {
  name: string;
  // Cron en America/La_Paz; sin cron, el job solo corre cuando alguien lo encola.
  cron?: string;
  run: () => Promise<unknown>;
};

// LIMITACIÓN: mail.dispatch y fx.fetch-official (F0) aún no existen; los correos esperan en notif.salida.
export const JOBS: readonly JobDefinition[] = [bagsExpireJob];
