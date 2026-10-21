// src/server/inventory/adjustments/adjustment-deciders.ts
// Quién puede decidir un ajuste (AGENTS.md §2.9): Administración, el GG y, si la solicitud tiene área, su gerente.
import type { Tx } from "@/server/db";

export async function findAdjustmentDeciders(
  tx: Tx,
  areaId: string | null,
): Promise<string[]> {
  const rows = await tx.userRole.findMany({
    where: {
      user: { isActive: true },
      OR: [
        { role: { code: { in: ["ADMINISTRACION", "GERENTE_GENERAL"] } } },
        ...(areaId
          ? [{ role: { code: "GERENTE_AREA" as const }, areaId }]
          : []),
      ],
    },
    select: { userId: true },
  });
  return [...new Set(rows.map((r) => r.userId))];
}
