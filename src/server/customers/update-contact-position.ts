// src/server/customers/update-contact-position.ts
// Edita un puesto de contacto: sus datos, sus áreas y sus responsables de DIMA; el nombre es de la persona y se
// actualiza en ella y en todos sus puestos (decisión 2026-11-06).
import { normalizeContactName } from "@/domain/customers/contact-normalize";
import type { Tx } from "@/server/db";
import type { NewPosition } from "./create-contact-position";

export async function updateContactPosition(
  tx: Tx,
  id: string,
  input: Omit<NewPosition, "personId">,
) {
  const { customerId, areaIds, userIds, name, ...fields } = input;
  // TRAMPA: el puesto se busca junto con su cliente; un id ajeno no edita otro cliente.
  const current = await tx.customerContact.findUniqueOrThrow({
    where: { id, customerId },
    select: { personId: true },
  });
  await tx.contactPerson.update({
    where: { id: current.personId },
    data: { name, normalizedName: normalizeContactName(name) },
  });
  await tx.customerContact.updateMany({
    where: { personId: current.personId },
    data: { name },
  });
  if (areaIds) {
    await tx.customerContactArea.deleteMany({ where: { contactId: id } });
    await tx.customerContactArea.createMany({
      data: areaIds.map((areaId) => ({ contactId: id, areaId })),
    });
  }
  if (userIds) {
    await tx.customerContactUser.deleteMany({ where: { contactId: id } });
    await tx.customerContactUser.createMany({
      data: userIds.map((userId) => ({ contactId: id, userId })),
    });
  }
  return tx.customerContact.update({ where: { id }, data: fields });
}
