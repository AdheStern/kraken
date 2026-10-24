// src/server/sales-control/cv-access.ts
// Hechos mínimos de un CV y una de sus versiones para decidir permisos (creador, vendedores, áreas de líneas y
// si esa versión está aprobada).
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
    select: { createdById: true },
  });
  const version = await db.cvVersion.findFirst({
    where: { id: versionId, cvId },
    select: { status: true },
  });
  if (!cv || !version) return null;
  // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
  const sellers = await db.cvVersionSeller.findMany({
    where: { versionId },
    select: { userId: true },
  });
  const lines = await db.cvLine.findMany({
    where: { versionId, areaId: { not: null } },
    select: { areaId: true },
    distinct: ["areaId"],
  });
  return {
    createdById: cv.createdById,
    sellerIds: sellers.map((s) => s.userId),
    lineAreaIds: lines.flatMap((l) => (l.areaId ? [l.areaId] : [])),
    // REGLA: Administración ve costos solo de lo aprobado, versión por versión (§2.9).
    isApprovedVersion:
      version.status === "APROBADA" || version.status === "REEMPLAZADA",
  };
}
