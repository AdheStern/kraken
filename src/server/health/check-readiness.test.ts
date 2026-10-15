// src/server/health/check-readiness.test.ts
// Disponibilidad del nodo (AGENTS.md §7): base que responde, base caída, base colgada y NFS ausente.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { checkReadiness } from "./check-readiness";

const db = (impl: () => Promise<unknown>) => ({ $queryRaw: vi.fn(impl) });

describe("checkReadiness", () => {
  it("lista con base y carpeta de adjuntos escribible", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kraken-files-"));
    const result = await checkReadiness(
      db(async () => [1]),
      dir,
    );
    expect(result).toEqual({
      ready: true,
      checks: { database: "ok", files: "ok" },
    });
  });

  it("sin FILES_ROOT solo revisa la base", async () => {
    const result = await checkReadiness(
      db(async () => [1]),
      undefined,
    );
    expect(result.checks).toEqual({ database: "ok" });
  });

  it("no está lista si la base falla o el NFS no está montado", async () => {
    const down = await checkReadiness(
      db(async () => {
        throw new Error("conexión rechazada");
      }),
      join(tmpdir(), "no-existe-kraken"),
    );
    expect(down.ready).toBe(false);
    expect(down.checks.database).toBe("conexión rechazada");
    expect(down.checks.files).not.toBe("ok");
  });

  it("una base colgada no cuelga la sonda", async () => {
    vi.useFakeTimers();
    const pending = checkReadiness(
      db(() => new Promise(() => {})),
      undefined,
    );
    await vi.advanceTimersByTimeAsync(2_000);
    expect((await pending).checks.database).toBe("sin respuesta en 2 s");
    vi.useRealTimers();
  });
});
