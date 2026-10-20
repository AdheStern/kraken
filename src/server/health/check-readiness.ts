// src/server/health/check-readiness.ts
// ¿Puede este nodo atender? Base de datos y, si los adjuntos van a FILES_ROOT, esa carpeta con escritura (AGENTS.md §7, ADR-16).
// HAProxy saca el nodo cuando falla.
import { constants } from "node:fs";
import { access } from "node:fs/promises";

const TIMEOUT_MS = 2_000;

export type Readiness = { ready: boolean; checks: Record<string, string> };

type Db = { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> };

export async function checkReadiness(
  db: Db,
  filesRoot: string | undefined,
): Promise<Readiness> {
  const checks: Record<string, string> = {};
  checks.database = await settle(() => db.$queryRaw`SELECT 1`);
  if (filesRoot)
    checks.files = await settle(() =>
      access(filesRoot, constants.W_OK | constants.R_OK),
    );
  return {
    ready: Object.values(checks).every((c) => c === "ok"),
    checks,
  };
}

async function settle(probe: () => Promise<unknown>): Promise<string> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("sin respuesta en 2 s")),
      TIMEOUT_MS,
    );
  });
  try {
    await Promise.race([probe(), timeout]);
    return "ok";
  } catch (error) {
    return error instanceof Error ? error.message : "falló";
  } finally {
    clearTimeout(timer);
  }
}
