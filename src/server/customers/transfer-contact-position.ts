// src/server/customers/transfer-contact-position.ts
// Transfiere a una persona de un cliente a otro: cierra su puesto actual (hasta hoy, con el motivo) y abre el
// nuevo con sus datos nuevos, en la misma transacción; el historial queda en los dos puestos (decisión 2026-11-06).
import type { Tx } from "@/server/db";
import {
  createContactPosition,
  type NewPosition,
} from "./create-contact-position";

export type Transfer = {
  fromContactId: string;
  to: Omit<NewPosition, "personId" | "startedOn">;
  reason: string;
  today: Date;
};

export async function transferContactPosition(tx: Tx, transfer: Transfer) {
  const from = await tx.customerContact.findUniqueOrThrow({
    where: { id: transfer.fromContactId },
    select: { id: true, personId: true, customerId: true, isActive: true },
  });
  if (!from.isActive)
    throw new TransferError("Ese contacto ya no está activo en su empresa.");
  if (from.customerId === transfer.to.customerId)
    throw new TransferError("Elige otra empresa: ya trabaja en esta.");
  const closed = await tx.customerContact.update({
    where: { id: from.id },
    data: {
      isActive: false,
      endedOn: transfer.today,
      exitReason: transfer.reason,
    },
  });
  const opened = await createContactPosition(tx, {
    ...transfer.to,
    personId: from.personId,
    startedOn: transfer.today,
  });
  return { closed, opened };
}

export class TransferError extends Error {}
