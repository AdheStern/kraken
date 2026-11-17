// src/features/admin/actions/share-customer-contact.ts
// «Compartir»: la misma persona pasa a ser contacto también de otras empresas, sin duplicar su ficha (decisión
// 2026-11-16). REGLA: solo se comparte un puesto que uno ve (scopeContactQuery, regla 7); el grupo no da visibilidad.
"use server";

import { z } from "zod";
import { toBusinessDate } from "@/domain/calendar/business-date";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canCreateContacts } from "@/server/authz/contact-permissions";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { systemClock } from "@/server/clock";
import { withOwnAreas } from "@/server/customers/contact-visibility-areas";
import { shareContactPosition } from "@/server/customers/share-contact-position";
import { prisma, runInTransaction } from "@/server/db";
import { guardCustomers } from "../customer-guard";

const schema = z.object({
  contactId: z.uuid(),
  customerIds: z.array(z.uuid()).min(1, "Elige al menos una empresa.").max(30),
});

export async function shareCustomerContact(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const { user, denied } = await guardCustomers(
    canCreateContacts,
    "compartir contactos",
  );
  if (denied) return denied;
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { contactId, customerIds } = parsed.data;
  try {
    const visible = await prisma.customerContact.count({
      where: {
        AND: [{ id: contactId, isActive: true }, scopeContactQuery(user)],
      },
    });
    if (visible === 0)
      return actionError("NOT_FOUND", "No encontramos ese contacto activo.");
    const result = await runInTransaction(async (tx) => {
      const shared = await shareContactPosition(tx, {
        sourceId: contactId,
        customerIds,
        extraAreaIds: withOwnAreas(user),
        startedOn: new Date(toBusinessDate(systemClock.now())),
      });
      for (const created of shared.created)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "core.cliente_contacto",
          entityId: created.id,
          action: "COMPARTIR",
          before: {
            id: shared.source.id,
            customerId: shared.source.customerId,
          },
          after: created,
        });
      return shared;
    });
    return actionOk({
      created: result.created.length,
      skipped: result.skipped.length,
    });
  } catch (error) {
    return toActionError(error, "shareCustomerContact");
  }
}
