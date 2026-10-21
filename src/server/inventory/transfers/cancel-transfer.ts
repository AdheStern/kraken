// src/server/inventory/transfers/cancel-transfer.ts
// Cancela un traspaso en BORRADOR (AGENTS.md §8); no había movido stock.
import type { Tx } from "@/server/db";
import { InventoryStateError } from "../inventory-errors";

// REGLA: solo un borrador se cancela; lo enviado se recibe o se da de baja con un ajuste (§8).
export async function cancelTransfer(
  tx: Tx,
  transferId: string,
): Promise<void> {
  const { count } = await tx.transfer.updateMany({
    where: { id: transferId, status: "BORRADOR" },
    data: { status: "CANCELADO" },
  });
  if (count === 0)
    throw new InventoryStateError("Solo se cancela un traspaso en borrador.");
}
