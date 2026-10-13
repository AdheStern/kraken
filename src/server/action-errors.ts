// src/server/action-errors.ts
// Traduce errores inesperados de una Server Action a ActionResult; nunca se lanzan al cliente (regla 10).
import { type ActionResult, actionError } from "@/lib/action-result";

// POR QUÉ: los triggers de cv (ADR-11) responden con check_violation y estos textos; se reportan como estado inválido.
const LOCKED_VERSION = /no admite cambios|es inmutable/;

export function toActionError<T>(
  error: unknown,
  context: string,
): ActionResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  if (LOCKED_VERSION.test(message)) {
    return actionError(
      "INVALID_STATE",
      "Esta versión ya no está en borrador. Crea una versión nueva para modificarla.",
    );
  }
  if (hasCode(error, "P2003")) {
    return actionError(
      "VALIDATION",
      "Uno de los datos elegidos ya no existe. Recarga la página.",
    );
  }
  console.error(`[${context}]`, error);
  return actionError(
    "INTERNAL",
    "No pudimos guardar los cambios. Intenta de nuevo en unos segundos.",
  );
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
