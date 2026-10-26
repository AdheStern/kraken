// src/features/documentation/actions/update-doc-project-header.ts
// Guarda la cabecera de un proyecto de documentación y audita el antes y el después (AGENTS.md §2.10).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { toDocProjectData } from "@/server/documentation/doc-project-data";
import { runUserAction } from "@/server/run-user-action";
import {
  type UpdateDocProjectInput,
  updateDocProjectSchema,
} from "../schemas/doc-project-schema";

export async function updateDocProjectHeader(
  input: UpdateDocProjectInput,
): Promise<ActionResult<null>> {
  const parsed = updateDocProjectSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { projectId, ...fields } = parsed.data;
  return runUserAction("updateDocProjectHeader", async (tx, user) => {
    if (!canUseDocumentation(user))
      return actionError("FORBIDDEN", "No tienes acceso a la documentación.");
    const before = await tx.docProject.findFirst({
      where: { AND: [{ id: projectId }, scopeDocProjectQuery(user)] },
      include: { technologies: { select: { technologyId: true } } },
    });
    if (!before) return actionError("NOT_FOUND", "El proyecto ya no existe.");
    const data = await toDocProjectData(tx, fields, before.customerId);
    if (!data.ok) return data;
    await tx.docProject.update({
      where: { id: projectId },
      data: {
        ...data.data,
        technologies: {
          deleteMany: {},
          create: fields.technologyIds.map((technologyId) => ({
            technologyId,
          })),
        },
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.proyecto",
      entityId: projectId,
      action: "EDITAR",
      before: {
        name: before.name,
        customerId: before.customerId,
        contactId: before.contactId,
        contactName: before.contactName,
        contactEmail: before.contactEmail,
        contactPhone: before.contactPhone,
        ownerId: before.ownerId,
        technologyIds: before.technologies.map((t) => t.technologyId),
      },
      after: { ...data.data, technologyIds: fields.technologyIds },
    });
    return actionOk(null);
  });
}
