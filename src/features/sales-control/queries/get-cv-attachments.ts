// src/features/sales-control/queries/get-cv-attachments.ts
// Adjuntos de un CV para su editor, solo para quien ve costos del CV (AGENTS.md §2.9, regla 12): con su tipo, la
// versión en que se subieron y si el usuario puede quitarlos. null = el usuario no ve adjuntos.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import {
  canDeleteCvAttachment,
  canSeeCvAttachments,
  canUploadCvAttachment,
} from "@/server/authz/cv-attachment-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { prisma } from "@/server/db";
import { selectFileStore } from "@/server/files/select-file-store";
import { loadCvAttachmentAccess } from "@/server/sales-control/cv-attachment-access";
import type { CvAttachments } from "../types";

export async function getCvAttachments(
  user: SessionUser,
  cvId: string,
): Promise<CvAttachments | null> {
  const found = await loadCvAttachmentAccess(user, cvId);
  if (!found || !canSeeCvAttachments(user, found.access)) return null;
  const rows = await prisma.cvAttachment.findMany({
    where: { cvId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      fileName: true,
      sizeBytes: true,
      createdAt: true,
      uploadedById: true,
      uploadedBy: { select: { user: { select: { name: true } } } },
      version: { select: { number: true } },
    },
  });
  return {
    canUpload: canUploadCvAttachment(user, found.access),
    filesEnabled: selectFileStore() !== null,
    items: rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      fileName: a.fileName,
      sizeBytes: a.sizeBytes,
      versionLabel: a.version
        ? toCvVersionLabel(found.code, a.version.number)
        : null,
      uploadedBy: a.uploadedBy.user.name,
      createdAt: a.createdAt.toISOString(),
      canDelete: canDeleteCvAttachment(user, found.access, a.uploadedById),
    })),
  };
}
