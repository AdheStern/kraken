// src/features/documentation/queries/list-doc-phases.ts
// Fases de documentación, activas e inactivas, en su orden y con cuántos documentos tiene cada una.
// LIMITACIÓN: sin alcance por usuario; el catálogo es público y solo se edita con canManageDocPhases.
import { prisma } from "@/server/db";
import type { DocPhaseItem } from "../types";

export async function listDocPhases(): Promise<DocPhaseItem[]> {
  const rows = await prisma.docPhase.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { documents: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    order: row.order,
    isActive: row.isActive,
    documentCount: row._count.documents,
  }));
}
