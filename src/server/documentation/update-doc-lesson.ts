// src/server/documentation/update-doc-lesson.ts
// Reemplaza el .txt de una lección aprendida con su nueva versión; la edita cualquier usuario con rol
// (AGENTS.md §2.10, ADR-16).
import { createHash } from "node:crypto";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { runInTransaction } from "@/server/db";
import type { FileStore } from "@/server/files/file-store";
import { LESSON_MIME_TYPE, toLessonBytes } from "./lesson-bytes";

type Edit = { documentId: string; baseVersion: string; markdown: string };

export async function updateDocLesson(
  user: SessionUser,
  { documentId, baseVersion, markdown }: Edit,
  store: FileStore,
): Promise<ActionResult<{ version: string }>> {
  if (!canUseDocumentation(user))
    return actionError("FORBIDDEN", "No tienes acceso a la documentación.");
  const data = toLessonBytes(markdown);
  const sha256 = createHash("sha256").update(data).digest("hex");
  return runInTransaction(async (tx) => {
    const lesson = await tx.docDocument.findFirst({
      where: {
        id: documentId,
        kind: "LECCION",
        project: scopeDocProjectQuery(user),
      },
      include: { phase: { select: { isActive: true } } },
    });
    if (!lesson) return actionError("NOT_FOUND", "La lección ya no existe.");
    if (!lesson.phase.isActive)
      return actionError(
        "INVALID_STATE",
        "La fase está dada de baja; sus lecciones ya no se editan.",
      );
    // TRAMPA: comparar y actualizar en una sola sentencia; una edición simultánea espera el bloqueo de la fila y
    // luego ya no encuentra la versión que abrió.
    const { count } = await tx.docDocument.updateMany({
      where: { id: documentId, sha256: baseVersion },
      data: {
        sha256,
        sizeBytes: data.byteLength,
        updatedById: user.id,
        updatedAt: new Date(),
      },
    });
    if (count === 0)
      return actionError(
        "CONFLICT",
        "Otra persona editó esta lección mientras escribías. Copia tu texto, vuelve a abrirla y aplica tus cambios.",
      );
    // POR QUÉ: el archivo se reemplaza dentro de la transacción; si SharePoint falla, la fila no cambia. Si la
    // transacción falla después, el historial de versiones de SharePoint conserva el contenido anterior.
    await store.replace(lesson.storagePath, data, LESSON_MIME_TYPE);
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.documento",
      entityId: documentId,
      action: "EDITAR",
      before: { sha256: lesson.sha256, sizeBytes: lesson.sizeBytes },
      after: { sha256, sizeBytes: data.byteLength, store: store.name },
    });
    return actionOk({ version: sha256 });
  });
}
