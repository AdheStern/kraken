// tests/e2e/global-setup.ts
// Antes de las pruebas, emite una sesión por rol demo (issue-sessions.ts) para el host del servidor bajo prueba.
import { execFileSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

export default function globalSetup(config: FullConfig) {
  const baseURL = new URL(
    config.projects[0].use.baseURL ?? "http://localhost:3000",
  );
  execFileSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "--env-file-if-exists=.env",
      "tests/e2e/issue-sessions.ts",
      baseURL.hostname,
    ],
    // POR QUÉ: en Windows pnpm es un .cmd; sin shell, execFile no lo encuentra.
    { stdio: "inherit", shell: process.platform === "win32" },
  );
}
