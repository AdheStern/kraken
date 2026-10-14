// src/features/admin/actions/upsert-customer.ts
// Crea o edita un cliente del catálogo. Los CV ya guardados conservan su copia de los datos (snapshot, §2.1).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type CustomerInput,
  customerSchema,
} from "../schemas/customer-schemas";

export async function upsertCustomer(
  input: CustomerInput,
): Promise<ActionResult<{ id: string }>> {
  const { denied } = await guardAdmin("commercial", "clientes");
  if (denied) return denied;
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, ...data } = parsed.data;
  try {
    const twin = await findTwin(data.name, data.taxId, id);
    if (twin)
      return actionError(
        "CONFLICT",
        `Ya existe «${twin.name}» con ese nombre o NIT. Ábrelo y edítalo en lugar de crear otro.`,
      );
    const saved = id
      ? await prisma.customer.update({ where: { id }, data })
      : await prisma.customer.create({ data });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "upsertCustomer");
  }
}

// POR QUÉ: un cliente repetido parte su historial de CV y sus bolsas en dos.
function findTwin(name: string, taxId: string | null, exceptId: string | null) {
  return prisma.customer.findFirst({
    where: {
      ...(exceptId ? { id: { not: exceptId } } : {}),
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        ...(taxId ? [{ taxId }] : []),
      ],
    },
    select: { name: true },
  });
}
