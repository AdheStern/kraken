// src/server/log.ts
// Logs en JSON, una línea por evento, para Loki (AGENTS.md §10 observabilidad). Sin dependencias de Next:
// lo usa también el worker.
export type Level = "info" | "warn" | "error";
export type Fields = Record<string, unknown>;

export function log(level: Level, msg: string, fields: Fields = {}): void {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, serialize(value)]),
    ),
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

function serialize(value: unknown): unknown {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  return value;
}
