// src/server/customers/share-contact-position.ts
// Comparte un contacto con otras empresas (decisión 2026-11-16): la misma persona abre un puesto en cada cliente
// con su cargo, correo, teléfono, municipio y responsables; la sucursal no, porque es de cada empresa. Salta los
// clientes donde ya tiene un puesto activo.
import type { Tx } from "@/server/db";
import { createContactPosition } from "./create-contact-position";

export type ShareInput = {
  sourceId: string;
  customerIds: readonly string[];
  // Áreas que se suman a las del puesto de origen (las de quien comparte, si no gestiona contactos).
  extraAreaIds: readonly string[];
  startedOn: Date;
};

export async function shareContactPosition(tx: Tx, input: ShareInput) {
  const source = await tx.customerContact.findUniqueOrThrow({
    where: { id: input.sourceId },
    include: { areas: true, assignees: true },
  });
  const taken = await tx.customerContact.findMany({
    where: {
      personId: source.personId,
      isActive: true,
      customerId: { in: [...input.customerIds] },
    },
    select: { customerId: true },
  });
  const skipped = new Set(taken.map((t) => t.customerId));
  const areaIds = [
    ...new Set([...source.areas.map((a) => a.areaId), ...input.extraAreaIds]),
  ];
  const created = [];
  // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
  for (const customerId of new Set(input.customerIds)) {
    if (customerId === source.customerId || skipped.has(customerId)) continue;
    created.push(
      await createContactPosition(tx, {
        customerId,
        personId: source.personId,
        name: source.name,
        position: source.position,
        email: source.email,
        phone: source.phone,
        municipalityId: source.municipalityId,
        startedOn: input.startedOn,
        areaIds,
        userIds: source.assignees.map((a) => a.userId),
      }),
    );
  }
  return { source, created, skipped: [...skipped] };
}
