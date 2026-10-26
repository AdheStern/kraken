// src/features/documentation/actions/delete-document.ts
// Quita un documento y borra su archivo; lo hace quien lo subió o el administrador del sistema (AGENTS.md §2.10).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canDeleteDocument } from "@/server/authz/documentation-permissions";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { selectFileStore } from "@/server/files/select-file-store";
import { log } from "@/server/log";
import { runUserAction } from "@/server/run-user-action";

const schema = z.object({ documentId: z.uuid() });

export async function deleteDocument(
  input: z.infer<typeof schema>,
): Promise<ActionResult<null>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError("VALIDATION", "Documento inválido.");
  const { documentId } = parsed.data;
  const result = await runUserAction("deleteDocument", async (tx, user) => {
    const document = await tx.docDocument.findFirst({
      where: { id: documentId, project: scopeDocProjectQuery(user) },
    });
    if (!document)
      return actionError("NOT_FOUND", "El documento ya no existe.");
    if (!canDeleteDocument(user, document))
      return actionError(
        "FORBIDDEN",
        "Solo quien subió el documento o el administrador del sistema lo quita.",
      );
    await tx.docDocument.delete({ where: { id: documentId } });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.documento",
      entityId: documentId,
      action: "QUITAR",
      before: {
        projectId: document.projectId,
        phaseId: document.phaseId,
        fileName: document.fileName,
      },
    });
    return actionOk(document.storagePath);
  });
  if (!result.ok) return result;
  // POR QUÉ: el archivo se borra después de confirmar; si falla queda huérfano en el almacén, nunca un registro roto.
  await selectFileStore()
    ?.remove(result.data)
    .catch((error: unknown) =>
      log("warn", "documento huérfano sin borrar", {
        storagePath: result.data,
        error: String(error),
      }),
    );
  return actionOk(null);
}
