// src/features/sales-control/queries/get-cv-leasing.ts
// Líneas de leasing de una versión. REGLA: son costos; sin permiso de costos no se envían (regla 12).
import { prisma } from "@/server/db";
import type { CvLeasingLineDraft } from "../schemas/cv-leasing-schema";

export async function getCvLeasing(
  versionId: string,
  canSeeCosts: boolean,
): Promise<CvLeasingLineDraft[]> {
  if (!canSeeCosts) return [];
  const lines = await prisma.cvLeasingLine.findMany({
    where: { versionId },
    orderBy: { position: "asc" },
  });
  return lines.map((line) => ({
    key: line.id,
    id: line.id,
    supplierId: line.supplierId,
    technologyId: line.technologyId,
    code: line.code ?? "",
    description: line.description,
    quantity: line.quantity.toString(),
    unitCostUsd: line.unitCostUsd.toFixed(2),
    notes: line.notes ?? "",
    poNumber: line.poNumber ?? "",
  }));
}
