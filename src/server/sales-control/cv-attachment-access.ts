// src/server/sales-control/cv-attachment-access.ts
// Hechos de permiso para los adjuntos de un CV visible: los de su última versión, la que abre el editor (§2.9).
import type { CvAccessFacts } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { loadCvAccess } from "./cv-access";

export type CvAttachmentAccess = {
  code: string;
  versionId: string;
  access: CvAccessFacts;
};

export async function loadCvAttachmentAccess(
  user: SessionUser,
  cvId: string,
  db: Tx = prisma,
): Promise<CvAttachmentAccess | null> {
  const cv = await db.cv.findFirst({
    where: { AND: [scopeCvQuery(user), { id: cvId }] },
    select: {
      code: true,
      versions: {
        orderBy: { number: "desc" },
        select: { id: true },
        take: 1,
      },
    },
  });
  const latest = cv?.versions[0];
  if (!cv || !latest) return null;
  const access = await loadCvAccess(cvId, latest.id, db);
  return access ? { code: cv.code, versionId: latest.id, access } : null;
}
