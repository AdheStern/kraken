// src/server/action-errors.ts
// Traduce errores inesperados de una Server Action a ActionResult; nunca se lanzan al cliente (regla 10).
import { type ActionResult, actionError } from "@/lib/action-result";
import { formatMinutes } from "@/lib/format-minutes";
import { FileStoreError } from "@/server/files/file-store";
import {
  BagPlanError,
  BagStateError,
  InsufficientBalanceError,
} from "@/server/hours/hour-errors";
import {
  InsufficientStockError,
  InventoryStateError,
} from "@/server/inventory/inventory-errors";
import { logInRequest } from "@/server/request-log";

// POR QUÉ: los triggers de cv (ADR-11) responden con check_violation y estos textos; se reportan como estado inválido.
// TRAMPA: anclado a «La versión»; los libros de horas e inventario también dicen «es inmutable».
const LOCKED_VERSION = /La versión .* (no admite cambios|es inmutable)/;
// REGLA: el CHECK de stock es la última red contra el sobregiro (ADR-03); llegar a él es falta de stock.
const STOCK_CHECK = /stock_cantidad_ck/;

export function toActionError<T>(
  error: unknown,
  context: string,
): ActionResult<T> {
  if (error instanceof InsufficientBalanceError) {
    return actionError(
      "INSUFFICIENT_BALANCE",
      `La bolsa no tiene saldo suficiente: quedan ${formatMinutes(error.balanceMinutes)}.`,
    );
  }
  if (error instanceof BagPlanError) {
    return actionError(error.code, error.message);
  }
  if (error instanceof FileStoreError) {
    void logInRequest("error", "almacén de archivos", {
      action: context,
      error: error.message,
    });
    return actionError(
      "EXTERNAL_UNAVAILABLE",
      "El almacén de archivos no respondió. Intenta de nuevo en unos minutos.",
    );
  }
  if (error instanceof BagStateError || error instanceof InventoryStateError) {
    return actionError("INVALID_STATE", error.message);
  }
  if (error instanceof InsufficientStockError) {
    return actionError("INSUFFICIENT_STOCK", error.message);
  }
  const message = error instanceof Error ? error.message : String(error);
  if (LOCKED_VERSION.test(message)) {
    return actionError(
      "INVALID_STATE",
      "Esta versión ya no está en borrador. Crea una versión nueva para modificarla.",
    );
  }
  if (STOCK_CHECK.test(message)) {
    return actionError(
      "INSUFFICIENT_STOCK",
      "Otro movimiento se llevó ese stock. Recarga la página y revisa las cantidades.",
    );
  }
  if (hasCode(error, "P2002")) {
    return actionError(
      "CONFLICT",
      "Ya existe un registro con ese nombre o código. Usa otro o edita el existente.",
    );
  }
  if (hasCode(error, "P2025")) {
    return actionError(
      "NOT_FOUND",
      "El registro ya no existe. Recarga la página.",
    );
  }
  if (hasCode(error, "P2003")) {
    return actionError(
      "VALIDATION",
      "Uno de los datos elegidos ya no existe. Recarga la página.",
    );
  }
  void logInRequest("error", "action falló", { action: context, error });
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
