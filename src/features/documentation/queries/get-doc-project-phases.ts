// src/features/documentation/queries/get-doc-project-phases.ts
// Las fases de un proyecto de documentación con sus documentos, en el orden del catálogo (AGENTS.md §2.10).
// REGLA: una fase dada de baja solo aparece si el proyecto tiene documentos en ella, y no admite subidas.
import { canDeleteDocument } from "@/server/authz/documentation-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { prisma } from "@/server/db";
import { selectFileStore } from "@/server/files/select-file-store";
import type { DocProjectPhases } from "../types";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export async function getDocProjectPhases(
  user: SessionUser,
  projectId: string,
): Promise<DocProjectPhases> {
  const phases = await prisma.docPhase.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      documents: {
        where: { projectId, project: scopeDocProjectQuery(user) },
        include: {
          uploadedBy: { select: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return {
    filesEnabled: selectFileStore() !== null,
    phases: phases
      .filter((phase) => phase.isActive || phase.documents.length > 0)
      .map((phase) => ({
        id: phase.id,
        name: phase.name,
        isActive: phase.isActive,
        documents: phase.documents.map((d) => ({
          id: d.id,
          fileName: d.fileName,
          sizeBytes: d.sizeBytes,
          uploadedBy: d.uploadedBy.user.name,
          uploadedAt: dateTime.format(d.createdAt),
          canDelete: canDeleteDocument(user, d),
        })),
      })),
  };
}
