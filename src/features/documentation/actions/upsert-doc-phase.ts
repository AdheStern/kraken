// src/features/documentation/actions/upsert-doc-phase.ts
// Crea una fase de documentación al final del orden o la renombra (AGENTS.md §2.10).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageDocPhases } from "@/server/authz/documentation-permissions";
import type { Tx } from "@/server/db";
import { runUserAction } from "@/server/run-user-action";
import {
  type DocPhaseInput,
  docPhaseSchema,
} from "../schemas/doc-phase-schemas";

export async function upsertDocPhase(
  input: DocPhaseInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = docPhaseSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, name } = parsed.data;
  return runUserAction("upsertDocPhase", async (tx, user) => {
    if (!canManageDocPhases(user))
      return actionError(
        "FORBIDDEN",
        "Solo el administrador del sistema edita las fases.",
      );
    const duplicate = await tx.docPhase.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(id ? { NOT: { id } } : {}),
      },
    });
    if (duplicate)
      return actionError(
        "CONFLICT",
        `Ya existe la fase «${duplicate.name}». Edita esa fase o usa otro nombre.`,
      );
    const saved = id
      ? await tx.docPhase.update({ where: { id }, data: { name } })
      : await tx.docPhase.create({
          data: { name, order: await nextOrder(tx) },
        });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.fase",
      entityId: saved.id,
      action: id ? "EDITAR" : "CREAR",
      after: { name },
    });
    return actionOk({ id: saved.id });
  });
}

async function nextOrder(tx: Tx): Promise<number> {
  const last = await tx.docPhase.aggregate({ _max: { order: true } });
  return (last._max.order ?? 0) + 1;
}
