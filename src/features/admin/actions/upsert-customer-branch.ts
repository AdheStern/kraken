// src/features/admin/actions/upsert-customer-branch.ts
// Agrega o edita una sucursal de un cliente (decisión 2026-11-06).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageCustomers } from "@/server/authz/contact-permissions";
import { runInTransaction } from "@/server/db";
import { guardCustomers } from "../customer-guard";
import { type BranchInput, branchSchema } from "../schemas/branch-schema";

export async function upsertCustomerBranch(
  input: BranchInput,
): Promise<ActionResult<{ id: string }>> {
  const { user, denied } = await guardCustomers(
    canManageCustomers,
    "editar las sucursales del cliente",
  );
  if (denied) return denied;
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, customerId, ...data } = parsed.data;
  try {
    // TRAMPA: la sucursal se busca junto con su cliente; un id ajeno no edita otro cliente.
    const saved = await runInTransaction(async (tx) => {
      const before = id
        ? await tx.customerBranch.findUnique({ where: { id } })
        : null;
      const after = id
        ? await tx.customerBranch.update({ where: { id, customerId }, data })
        : await tx.customerBranch.create({ data: { ...data, customerId } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.cliente_sucursal",
        entityId: after.id,
        action: id ? "EDITAR" : "CREAR",
        before,
        after,
      });
      return after;
    });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "upsertCustomerBranch");
  }
}
