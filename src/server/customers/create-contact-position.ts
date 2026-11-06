// src/server/customers/create-contact-position.ts
// Da de alta un puesto de contacto en un cliente: con una persona ya existente (agregarle un puesto o transferirla)
// o creando la persona nueva con su nombre normalizado (decisión 2026-11-06).
import { normalizeContactName } from "@/domain/customers/contact-normalize";
import type { Tx } from "@/server/db";

export type NewPosition = {
  customerId: string;
  // Sin persona se crea una nueva con este nombre.
  personId?: string | null;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  municipalityId?: string | null;
  branchId?: string | null;
  startedOn?: Date | null;
  areaIds?: readonly string[];
  userIds?: readonly string[];
};

export async function createContactPosition(tx: Tx, input: NewPosition) {
  const { personId, areaIds = [], userIds = [], ...fields } = input;
  const person = personId
    ? await tx.contactPerson.findUniqueOrThrow({ where: { id: personId } })
    : await tx.contactPerson.create({
        data: {
          name: fields.name,
          normalizedName: normalizeContactName(fields.name),
        },
      });
  return tx.customerContact.create({
    data: {
      ...fields,
      name: person.name,
      personId: person.id,
      areas: { create: areaIds.map((areaId) => ({ areaId })) },
      assignees: { create: userIds.map((userId) => ({ userId })) },
    },
  });
}
