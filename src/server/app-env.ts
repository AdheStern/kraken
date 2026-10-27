// src/server/app-env.ts
// Entorno de despliegue (APP_ENV: production | staging), aparte de NODE_ENV: las dos imágenes son las mismas y
// corren con NODE_ENV=production en ambos entornos (AGENTS.md §10).
type Env = Record<string, string | undefined>;

// REGLA: solo el valor exacto "staging" relaja algo; sin APP_ENV o con otro valor rige producción, la opción estricta.
export function isStagingEnv(env: Env = process.env): boolean {
  return env.APP_ENV === "staging";
}
