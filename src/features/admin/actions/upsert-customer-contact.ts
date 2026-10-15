// src/features/admin/actions/upsert-customer-contact.ts
// Agrega o edita un contacto de un cliente (nombre, cargo, correo y teléfono).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
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
  const { id, customerId, ...data } = parsed.data;
  try {
    // TRAMPA: el id del contacto se busca junto con su cliente; un id ajeno no edita otro cliente.
    const saved = await runInTransaction(async (tx) => {
      const before = id
        ? await tx.customerContact.findUnique({ where: { id } })
        : null;
      const after = id
        ? await tx.customerContact.update({ where: { id, customerId }, data })
        : await tx.customerContact.create({ data: { ...data, customerId } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.cliente_contacto",
        entityId: after.id,
        action: id ? "EDITAR" : "CREAR",
        before,
        after,
      });
      return after;
    });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "upsertCustomerContact");
  }
}
