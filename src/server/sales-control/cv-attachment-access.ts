// src/server/sales-control/cv-attachment-access.ts
// Hechos de permiso para los adjuntos de un CV visible: los de la versión que el usuario ve en el editor (quien
// entra solo por Administración ve la última aprobada o reemplazada, §2.9).
import type { CvAccessFacts } from "@/server/authz/cv-permissions";
import { seesOnlyApprovedVersions } from "@/server/authz/cv-permissions";
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
        select: { id: true, status: true },
      },
    },
  });
  const latest = cv?.versions[0];
  if (!cv || !latest) return null;
  const latestAccess = await loadCvAccess(cvId, latest.id, db);
  if (!latestAccess) return null;
  const shown = seesOnlyApprovedVersions(user, latestAccess)
    ? cv.versions.find(
        (v) => v.status === "APROBADA" || v.status === "REEMPLAZADA",
      )
    : latest;
  if (!shown) return null;
  const access =
    shown.id === latest.id
      ? latestAccess
      : await loadCvAccess(cvId, shown.id, db);
  return access ? { code: cv.code, versionId: shown.id, access } : null;
}
