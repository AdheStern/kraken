// src/lib/action-result.ts
// Contrato de respuesta de las Server Actions: nunca lanzan al cliente (AGENTS.md regla 10 y §7).

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE"
  | "INSUFFICIENT_BALANCE"
  | "INSUFFICIENT_STOCK"
  | "EXTERNAL_UNAVAILABLE"
  | "INTERNAL";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError<T = never>(
  code: ErrorCode,
  message: string,
): ActionResult<T> {
  return { ok: false, error: { code, message } };
}
