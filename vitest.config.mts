// vitest.config.mts
// Tests de dominio, canónicos y de autorización (sin base de datos). La integración usa vitest.int.config.mts.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: [
      "src/**/*.test.ts",
      "tests/canon/**/*.test.ts",
      "tests/authz/**/*.test.ts",
      "tests/golden/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      exclude: ["src/domain/**/*.test.ts"],
      // REGLA: mínimo 95% en src/domain (AGENTS.md §11).
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
