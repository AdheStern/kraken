// src/server/sales-control/recompute-version-totals.ts
// Vuelve a sumar los totales de una versión desde sus líneas ITEM guardadas, con los TC de la versión
// (AGENTS.md §2.2 y §15.4). Lo usa la renovación, que copia solo algunas líneas.
import Decimal from "decimal.js";
import { computeLineTotals } from "@/domain/pricing/compute-line-totals";
import { computeVersionTotals } from "@/domain/pricing/compute-version-totals";
import type { Tx } from "@/server/db";

const ZERO = new Decimal(0);

export async function recomputeVersionTotals(
  tx: Tx,
  versionId: string,
): Promise<void> {
  const version = await tx.cvVersion.findUniqueOrThrow({
    where: { id: versionId },
    select: {
      costFxRate: true,
      saleFxRate: true,
      lines: {
        where: { kind: "ITEM" },
        select: { quantity: true, unitCostUsd: true, unitSaleUsd: true },
      },
    },
  });
  const fx = {
    costFxRate: new Decimal(version.costFxRate.toString()),
    saleFxRate: new Decimal(version.saleFxRate.toString()),
  };
  const totals = computeVersionTotals(
    version.lines.map((line) =>
      computeLineTotals(
        {
          quantity: toDecimal(line.quantity),
          unitCostUsd: toDecimal(line.unitCostUsd),
          unitSaleUsd: toDecimal(line.unitSaleUsd),
        },
        fx,
      ),
    ),
  );
  await tx.cvVersion.update({
    where: { id: versionId },
    data: {
      totalCostUsd: totals.totalCostUsd.toFixed(2),
      totalSaleUsd: totals.totalSaleUsd.toFixed(2),
    },
  });
}

function toDecimal(value: { toString(): string } | null): Decimal {
  return value ? new Decimal(value.toString()) : ZERO;
}
