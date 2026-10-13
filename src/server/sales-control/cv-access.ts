// src/server/sales-control/cv-access.ts
// Hechos mínimos de un CV para decidir permisos (creador, vendedores, áreas de líneas, si hay aprobada).
import type { CvAccessFacts } from "@/server/authz/cv-permissions";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";

export async function loadCvAccess(
  cvId: string,
  versionId: string,
  db: Tx = prisma,
): Promise<CvAccessFacts | null> {
  const cv = await db.cv.findUnique({
    where: { id: cvId },
    select: {
      createdById: true,
      versions: {
        where: { status: "APROBADA" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!cv) return null;
  const [sellers, lines] = await Promise.all([
    db.cvVersionSeller.findMany({
      where: { versionId },
      select: { userId: true },
    }),
    db.cvLine.findMany({
      where: { versionId, areaId: { not: null } },
      select: { areaId: true },
      distinct: ["areaId"],
    }),
  ]);
  return {
    createdById: cv.createdById,
    sellerIds: sellers.map((s) => s.userId),
    lineAreaIds: lines.flatMap((l) => (l.areaId ? [l.areaId] : [])),
    hasApprovedVersion: cv.versions.length > 0,
  };
}
