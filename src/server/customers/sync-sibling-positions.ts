// src/server/customers/sync-sibling-positions.ts
// Al editar un contacto compartido, lleva su correo y teléfono a los otros puestos activos de la misma persona que
// se eligieron (decisión 2026-11-16). El nombre ya es de la persona y viaja solo (update-contact-position.ts).
import type { Tx } from "@/server/db";

export async function syncSiblingPositions(
  tx: Tx,
  sourceId: string,
  siblingIds: readonly string[],
) {
  if (siblingIds.length === 0) return [];
  const source = await tx.customerContact.findUniqueOrThrow({
    where: { id: sourceId },
    select: { personId: true, email: true, phone: true },
  });
  // REGLA: solo puestos activos de la misma persona; un id ajeno se ignora.
  const where = {
    id: { in: [...siblingIds], not: sourceId },
    personId: source.personId,
    isActive: true,
  };
  const before = await tx.customerContact.findMany({ where });
  await tx.customerContact.updateMany({
    where,
    data: { email: source.email, phone: source.phone },
  });
  return before;
}
