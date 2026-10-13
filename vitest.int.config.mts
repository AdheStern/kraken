// vitest.int.config.mts
// Tests de integración contra PostgreSQL real (Testcontainers): triggers, CHECK, concurrencia, actions.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.int.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // POR QUÉ: arrancar el contenedor y migrar tarda; los archivos comparten la base y no deben correr en paralelo.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
