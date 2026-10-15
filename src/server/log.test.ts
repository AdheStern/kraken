// src/server/log.test.ts
// Logs en JSON por línea (AGENTS.md §10): campos fijos, errores legibles y salida de error separada.
import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("log", () => {
  it("escribe una línea JSON con nivel, mensaje y campos", () => {
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    log("info", "listo", { jobs: 2 });
    const line = JSON.parse(String(out.mock.calls[0][0]));
    expect(line).toMatchObject({ level: "info", msg: "listo", jobs: 2 });
    expect(typeof line.time).toBe("string");
  });

  it("los errores van a stderr con nombre, mensaje y pila", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    log("error", "falló", { error: new TypeError("sin conexión") });
    const line = JSON.parse(String(err.mock.calls[0][0]));
    expect(line.error).toMatchObject({
      name: "TypeError",
      message: "sin conexión",
    });
    expect(line.error.stack).toContain("TypeError");
  });
});
