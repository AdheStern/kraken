// src/features/admin/actions/upsert-customer-contact.ts
// Agrega o edita el puesto de un contacto en un cliente: datos corporativos, municipio, sucursal, áreas de DIMA y
// quiénes lo atienden. Al agregar crea la persona o usa una ya registrada (decisión 2026-11-06).
// REGLA: cualquier persona de DIMA agrega contactos; editarlos es de quien gestiona contactos (§2.9).
"use server";

import { toBusinessDate } from "@/domain/calendar/business-date";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import {
  canCreateContacts,
  canManageContacts,
} from "@/server/authz/contact-permissions";
import { memberAreaIds, type SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { systemClock } from "@/server/clock";
import { createContactPosition } from "@/server/customers/create-contact-position";
import { updateContactPosition } from "@/server/customers/update-contact-position";
import { prisma, runInTransaction } from "@/server/db";
import { guardCustomers } from "../customer-guard";
import {
  type CustomerContactInput,
  customerContactSchema,
} from "../schemas/customer-schemas";

export async function upsertCustomerContact(
  input: CustomerContactInput,
): Promise<ActionResult<{ id: string }>> {
  const { user, denied } = await guardCustomers(
    input.id ? canManageContacts : canCreateContacts,
    input.id ? "editar contactos" : "crear contactos",
  );
  if (denied) return denied;
  const parsed = customerContactSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, ...fields } = parsed.data;
  const data = { ...fields, areaIds: withOwnAreas(user, fields.areaIds) };
  try {
    if (data.personId && !(await canUsePerson(user, data.personId)))
      return actionError("NOT_FOUND", "No encontramos a esa persona.");
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

// POR QUÉ: quien no gestiona contactos solo ve los de sus áreas; sin ellas no vería el contacto que acaba de crear.
function withOwnAreas(
  user: SessionUser,
  areaIds: readonly string[] = [],
): string[] {
  if (canManageContacts(user)) return [...areaIds];
  return [...new Set([...areaIds, ...memberAreaIds(user)])];
}

async function canUsePerson(user: SessionUser, personId: string) {
  const visible = await prisma.customerContact.count({
    where: { AND: [{ personId }, scopeContactQuery(user)] },
  });
  return visible > 0;
}
