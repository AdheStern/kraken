// src/features/sales-control/queries/get-cv-comparison.ts
// Comparación línea por línea de dos versiones de un CV visible para el usuario, con la diferencia de
// totales (AGENTS.md §2.3). Sin permiso de costos, ni las líneas ni los totales llevan costo o factor.
import Decimal from "decimal.js";
import {
  type ComparableLine,
  compareVersionLines,
} from "@/domain/sales-control/compare-versions";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Prisma } from "@/generated/prisma/client";
import { canSeeCvCosts } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import type { CvComparisonData } from "../types";

const LINE_INCLUDE = {
  area: { select: { code: true } },
  supplier: { select: { name: true } },
  unit: { select: { code: true } },
  group: { select: { name: true } },
} as const;

type VersionNumbers = { from: number; to: number };

export async function getCvComparison(
  user: SessionUser,
  cvId: string,
  numbers: VersionNumbers,
): Promise<CvComparisonData | null> {
  const cv = await prisma.cv.findFirst({
    where: { AND: [scopeCvQuery(user), { id: cvId }] },
    select: { id: true, code: true },
  });
  if (!cv) return null;
  const versions = await prisma.cvVersion.findMany({
    where: { cvId, number: { in: [numbers.from, numbers.to] } },
    include: { lines: { orderBy: { position: "asc" }, include: LINE_INCLUDE } },
  });
  const before = versions.find((v) => v.number === numbers.from);
  const after = versions.find((v) => v.number === numbers.to);
  if (!before || !after) return null;
  const access = await loadCvAccess(cv.id, after.id);
  const withCosts = access !== null && canSeeCvCosts(user, access);

  return {
    cvId: cv.id,
    fromLabel: toCvVersionLabel(cv.code, before.number),
    toLabel: toCvVersionLabel(cv.code, after.number),
    rows: compareVersionLines(
      before.lines.map((line) => toComparable(line, withCosts)),
      after.lines.map((line) => toComparable(line, withCosts)),
    ),
    totals: [
      totalRow("Venta total USD", before.totalSaleUsd, after.totalSaleUsd),
      ...(withCosts
        ? [totalRow("Costo total USD", before.totalCostUsd, after.totalCostUsd)]
        : []),
    ],
  };
}

type LineRow = Prisma.CvLineGetPayload<{ include: typeof LINE_INCLUDE }>;

function toComparable(line: LineRow, withCosts: boolean): ComparableLine {
  const fields: Record<string, string> = {
    Lote: line.group?.name ?? "",
    Área: line.area?.code ?? "",
    Proveedor: line.supplier?.name ?? "",
    Unidad: line.unit?.code ?? "",
    Cantidad: line.quantity?.toFixed(2) ?? "",
    "Venta unit. USD": line.unitSaleUsd?.toFixed(2) ?? "",
    "PO#": line.poNumber ?? "",
  };
  if (withCosts) {
    fields["Costo unit. USD"] = line.unitCostUsd?.toFixed(2) ?? "";
    fields.Factor = line.factor?.toFixed(2) ?? "";
  }
  return { code: line.code, description: line.description, fields };
}

function totalRow(
  label: string,
  before: { toString(): string },
  after: { toString(): string },
) {
  const a = new Decimal(before.toString());
  const b = new Decimal(after.toString());
  return {
    label,
    before: a.toFixed(2),
    after: b.toFixed(2),
    diff: b.minus(a).toFixed(2),
  };
}
