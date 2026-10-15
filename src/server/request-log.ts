// src/server/request-log.ts
// Log de una petición con el requestId que pone HAProxy en x-request-id, para seguirla del borde a la base
// (AGENTS.md §10).
import { headers } from "next/headers";
import { type Fields, type Level, log } from "./log";

// POR QUÉ: fuera de una petición (worker, scripts) headers() lanza; entonces se registra sin requestId.
export async function logInRequest(
  level: Level,
  msg: string,
  fields: Fields = {},
): Promise<void> {
  let requestId: string | null = null;
  try {
    requestId = (await headers()).get("x-request-id");
  } catch {
    requestId = null;
  }
  log(level, msg, requestId ? { requestId, ...fields } : fields);
}
