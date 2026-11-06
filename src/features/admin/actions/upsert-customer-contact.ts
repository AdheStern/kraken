// src/features/admin/actions/upsert-customer-contact.ts
// Agrega o edita el puesto de un contacto en un cliente: datos corporativos, municipio, sucursal, áreas de DIMA y
// quiénes lo atienden. Al agregar crea la persona o usa una ya registrada (decisión 2026-11-06).
"use server";

import { toBusinessDate } from "@/domain/calendar/business-date";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { systemClock } from "@/server/clock";
import { createContactPosition } from "@/server/customers/create-contact-position";
import { updateContactPosition } from "@/server/customers/update-contact-position";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type CustomerContactInput,
  customerContactSchema,
} from "../schemas/customer-schemas";

export async function upsertCustomerContact(
  input: CustomerContactInput,
): Promise<ActionResult<{ id: string }>> {
  const { user, denied } = await guardAdmin("commercial", "clientes");
  if (denied) return denied;
  const parsed = customerContactSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, ...data } = parsed.data;
  try {
    const saved = await runInTransaction(async (tx) => {
      const before = id
        ? await tx.customerContact.findUnique({ where: { id } })
        : null;
      const after = id
        ? await updateContactPosition(tx, id, data)
        : await createContactPosition(tx, {
            ...data,
            startedOn: new Date(toBusinessDate(systemClock.now())),
          });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.cliente_contacto",
        entityId: after.id,
        action: id ? "EDITAR" : "CREAR",
        before,
        after: { ...after, areaIds: data.areaIds, userIds: data.userIds },
      });
      return after;
    });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "upsertCustomerContact");
  }
}
