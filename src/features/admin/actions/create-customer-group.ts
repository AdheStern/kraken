// src/features/admin/actions/create-customer-group.ts
// Crea un grupo empresarial (clientes hermanos) desde la ficha del cliente; si ya existe con ese nombre, aunque
// cambien mayúsculas o tildes, devuelve el existente (decisión 2026-11-16).
"use server";

import { z } from "zod";
import { normalizeContactName } from "@/domain/customers/contact-normalize";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageCustomers } from "@/server/authz/contact-permissions";
import { runInTransaction } from "@/server/db";
import { guardCustomers } from "../customer-guard";

const schema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del grupo.").max(120),
});

export async function createCustomerGroup(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ id: string; name: string }>> {
  const { user, denied } = await guardCustomers(
    canManageCustomers,
    "crear grupos empresariales",
  );
  if (denied) return denied;
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const name = parsed.data.name.replace(/\s+/g, " ");
  const normalizedName = normalizeContactName(name);
  try {
    const group = await runInTransaction(async (tx) => {
      const existing = await tx.customerGroup.findUnique({
        where: { normalizedName },
        select: { id: true, name: true },
      });
      if (existing) return existing;
      const created = await tx.customerGroup.create({
        data: { name, normalizedName },
        select: { id: true, name: true },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.grupo_empresarial",
        entityId: created.id,
        action: "CREAR",
        before: null,
        after: created,
      });
      return created;
    });
    return actionOk(group);
  } catch (error) {
    return toActionError(error, "createCustomerGroup");
  }
}
