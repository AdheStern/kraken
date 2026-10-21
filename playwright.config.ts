// playwright.config.ts
// Pruebas E2E (AGENTS.md §11) contra el build (`pnpm build` antes), con una base sembrada con
// `pnpm db:seed:dev`. POR QUÉ el build: con `pnpm dev`, notFound() dentro de un Suspense no pinta su página.
// En local usa Edge y reutiliza el servidor si ya corre; en CI, el Chromium de Playwright.
import { defineConfig, devices } from "@playwright/test";

const isCi = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // POR QUÉ: contra un solo servidor de producción, más de dos navegadores a la vez agotan los tiempos en equipos chicos.
  workers: 2,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "es-BO",
    timezoneId: "America/La_Paz",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "escritorio",
      // POR QUÉ: el recorrido de inventario consume el stock del seed (un serial se despacha una vez); corre solo en tablet.
      testIgnore: /inventory\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...(isCi ? {} : { channel: "msedge" }),
      },
    },
    {
      name: "tablet",
      testMatch: /inventory\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
        ...(isCi ? {} : { channel: "msedge" }),
      },
    },
  ],
  webServer: {
    command: "pnpm start -p 3100",
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
