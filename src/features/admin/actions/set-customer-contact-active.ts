// src/features/admin/actions/set-customer-contact-active.ts
// Da de baja o reactiva un contacto de cliente (borrado lógico de catálogo, AGENTS.md §4).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import { type ActiveInput, activeSchema } from "../schemas/customer-schemas";

export async function setCustomerContactActive(
  input: ActiveInput,
): Promise<ActionResult<null>> {
  const { denied } = await guardAdmin("commercial", "clientes");
  if (denied) return denied;
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, isActive } = parsed.data;
  try {
    await prisma.customerContact.update({ where: { id }, data: { isActive } });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setCustomerContactActive");
  }
}
