// src/server/sales-control/change-cv-customer.ts
// Corrige el cliente de un CV en cualquier estado (§2.3, decisión 2026-11-12): el CV, el snapshot de todas sus
// versiones y sus bolsas de horas pasan al cliente nuevo. Se rechaza si alguna bolsa ya la usa un ticket.
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import type { Tx } from "@/server/db";

export type ChangeCvCustomerInput = {
  cvId: string;
  customerId: string;
  reason: string;
  actorId: string;
};

export async function changeCvCustomerInTx(
  tx: Tx,
  input: ChangeCvCustomerInput,
): Promise<ActionResult<{ bags: number }>> {
  await tx.$queryRaw`SELECT id FROM cv.cv WHERE id = ${input.cvId}::uuid FOR UPDATE`;
  const cv = await tx.cv.findUnique({
    where: { id: input.cvId },
    select: { id: true, code: true, customerId: true },
  });
  if (!cv) return actionError("NOT_FOUND", "El CV ya no existe.");
  if (cv.customerId === input.customerId)
    return actionError("VALIDATION", "El CV ya es de ese cliente.");
  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer?.isActive)
    return actionError("VALIDATION", "Elige un cliente activo del catálogo.");

  const bags = await tx.hourBag.findMany({
    where: { cvLine: { version: { cvId: cv.id } } },
    select: { id: true },
  });
  const blocker = await findBagUse(
    tx,
    bags.map((b) => b.id),
  );
  if (blocker) return actionError("CONFLICT", blocker);

  await rewriteVersions(tx, cv.id, cv.customerId, customer);
  await tx.cv.update({
    where: { id: cv.id },
    data: { customerId: customer.id },
  });
  await tx.hourBag.updateMany({
    where: { id: { in: bags.map((b) => b.id) } },
    data: { customerId: customer.id },
  });
  await recordAudit(tx, {
    actorId: input.actorId,
    entity: "cv.cv",
    entityId: cv.id,
    action: "CAMBIAR_CLIENTE",
    before: { customerId: cv.customerId },
    after: {
      customerId: customer.id,
      reason: input.reason,
      bagIds: bags.map((b) => b.id),
    },
  });
  return actionOk({ bags: bags.length });
}

// REGLA: un ticket solo usa bolsas de su cliente (§2.6); si una bolsa ya está en un ticket o tiene consumos,
// cambiarla de cliente rompería ese ticket, así que se bloquea (decisión 2026-11-12).
async function findBagUse(tx: Tx, bagIds: string[]): Promise<string | null> {
  if (bagIds.length === 0) return null;
  const inTickets = await tx.ticketBag.findMany({
    where: { bagId: { in: bagIds } },
    select: { ticket: { select: { number: true } } },
    distinct: ["ticketId"],
    take: 5,
  });
  if (inTickets.length > 0)
    return `Sus horas ya las usan tickets del cliente actual (${inTickets.map((t) => `#${t.ticket.number}`).join(", ")}). Quita sus bolsas de esos tickets antes de cambiar el cliente.`;
  const used = await tx.hourMovement.count({
    where: { bagId: { in: bagIds }, kind: { in: ["CONSUMO", "REVERSO"] } },
  });
  return used > 0
    ? "Sus bolsas de horas ya tienen consumos del cliente actual; el cliente no se puede cambiar."
    : null;
}

type CatalogCustomer = NonNullable<
  Awaited<ReturnType<Tx["customer"]["findUnique"]>>
>;

// POR QUÉ: el contacto y la dirección eran del cliente anterior; se vuelven a los del cliente nuevo y el contacto
// queda por elegir. El cliente final cambia solo si era el mismo cliente.
async function rewriteVersions(
  tx: Tx,
  cvId: string,
  previousCustomerId: string,
  customer: CatalogCustomer,
) {
  const versions = await tx.cvVersion.findMany({
    where: { cvId },
    select: { id: true, endCustomerId: true, customerSnapshot: true },
  });
  // POR QUÉ: misma forma que toCustomerParty (features/sales-control/customer-snapshot.ts) sin contacto;
  // src/server no importa de features.
  const party = {
    name: customer.name,
    taxId: customer.taxId,
    contactName: null,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    country: customer.country,
  };
  for (const version of versions) {
    const sameEnd = version.endCustomerId === previousCustomerId;
    const snapshot = (version.customerSnapshot ?? {}) as Record<
      string,
      unknown
    >;
    await tx.cvVersion.update({
      where: { id: version.id },
      data: {
        endCustomerId: sameEnd ? customer.id : version.endCustomerId,
        customerSnapshot: {
          ...snapshot,
          customer: party,
          endCustomer: sameEnd ? party : (snapshot.endCustomer ?? null),
        },
      },
    });
  }
}
