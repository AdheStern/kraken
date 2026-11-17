// src/server/customers/transfer-contact-position.ts
// Transfiere a una persona de un cliente a otro: cierra su puesto actual y, si se eligen, sus otros puestos activos
// (contacto compartido: si se cambia de empresa, deja todas; decisión 2026-11-16), hasta hoy y con el motivo, y abre
// el nuevo con sus datos nuevos, en la misma transacción; el historial queda en cada puesto (decisión 2026-11-06).
import type { Tx } from "@/server/db";
import {
  createContactPosition,
  type NewPosition,
} from "./create-contact-position";

export type Transfer = {
  fromContactId: string;
  // Otros puestos activos de la misma persona que también se cierran.
  alsoCloseIds?: readonly string[];
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
  const closing = await positionsToClose(tx, from, transfer.alsoCloseIds);
  const stays = await tx.customerContact.findFirst({
    where: {
      personId: from.personId,
      customerId: transfer.to.customerId,
      isActive: true,
    },
    select: { id: true },
  });
  if (stays) throw new TransferError("Elige otra empresa: ya trabaja en esta.");
  const closed = [];
  for (const id of closing)
    closed.push(
      await tx.customerContact.update({
        where: { id },
        data: {
          isActive: false,
          endedOn: transfer.today,
          exitReason: transfer.reason,
        },
      }),
    );
  const opened = await createContactPosition(tx, {
    ...transfer.to,
    personId: from.personId,
    startedOn: transfer.today,
  });
  return { closed: closed[0], alsoClosed: closed.slice(1), opened };
}

// REGLA: solo se cierran puestos activos de la misma persona; un id ajeno o ya cerrado se rechaza.
async function positionsToClose(
  tx: Tx,
  from: { id: string; personId: string },
  alsoCloseIds: readonly string[] = [],
): Promise<string[]> {
  const extra = [...new Set(alsoCloseIds)].filter((id) => id !== from.id);
  if (extra.length === 0) return [from.id];
  const valid = await tx.customerContact.count({
    where: { id: { in: extra }, personId: from.personId, isActive: true },
  });
  if (valid !== extra.length)
    throw new TransferError(
      "Uno de los puestos a cerrar ya no está activo o es de otra persona.",
    );
  return [from.id, ...extra];
}

export class TransferError extends Error {}
