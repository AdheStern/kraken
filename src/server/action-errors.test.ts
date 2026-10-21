// src/server/action-errors.test.ts
// Traducción de errores a ActionResult: el texto de versión bloqueada no captura los libros de horas ni de
// inventario, y la falta de stock llega como INSUFFICIENT_STOCK (AGENTS.md §7).
import { describe, expect, it, vi } from "vitest";
import { toActionError } from "./action-errors";
import {
  InsufficientStockError,
  InventoryStateError,
} from "./inventory/inventory-errors";

vi.mock("./request-log", () => ({ logInRequest: vi.fn() }));

const codeOf = (error: unknown) => {
  const result = toActionError(error, "test");
  return result.ok ? null : result.error.code;
};

describe("toActionError", () => {
  it("reporta la versión bloqueada del CV como estado inválido", () => {
    const error = new Error("La versión 0190 está en APROBADA y es inmutable");
    expect(codeOf(error)).toBe("INVALID_STATE");
  });

  it("no confunde los libros inmutables con una versión bloqueada", () => {
    const hours = new Error(
      "horas.movimiento es inmutable; registra un movimiento nuevo",
    );
    const inventory = new Error(
      "inv.reserva_movimiento es inmutable; registra un movimiento nuevo",
    );
    expect(codeOf(hours)).toBe("INTERNAL");
    expect(codeOf(inventory)).toBe("INTERNAL");
  });

  it("traduce la falta de stock y el CHECK del stock a INSUFFICIENT_STOCK", () => {
    expect(codeOf(new InsufficientStockError("FG-100F", "2"))).toBe(
      "INSUFFICIENT_STOCK",
    );
    const check = new Error(
      'new row for relation "stock" violates check constraint "stock_cantidad_ck"',
    );
    expect(codeOf(check)).toBe("INSUFFICIENT_STOCK");
  });

  it("reporta un estado de inventario inválido con su mensaje", () => {
    const result = toActionError(
      new InventoryStateError("El serial ya fue despachado."),
      "test",
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_STATE", message: "El serial ya fue despachado." },
    });
  });
});
