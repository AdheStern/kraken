// src/features/sales-control/queries/editor-header.ts
// Convierte una versión de CV en la cabecera de presentación del editor (fechas como texto, TC con 2+ decimales).
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Prisma } from "@/generated/prisma/client";
import { parseCustomerSnapshot } from "../customer-snapshot";
import type { CvEditorHeader } from "../types";

type CvBase = {
  id: string;
  code: string;
  isOpeningBalance: boolean;
  city: { name: string };
  customer: { name: string };
};
type VersionRow = Prisma.CvVersionGetPayload<{
  include: { sellers: { select: { userId: true } } };
}>;

const toDateInput = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : "";

// REGLA: el TC se muestra con 2 decimales salvo que tenga más (AGENTS.md §15.4).
const toFxText = (rate: {
  decimalPlaces: () => number;
  toFixed: (dp: number) => string;
}) => rate.toFixed(Math.max(2, rate.decimalPlaces()));

export function toEditorHeader(
  cv: CvBase,
  version: VersionRow,
): CvEditorHeader {
  return {
    cvId: cv.id,
    versionId: version.id,
    code: cv.code,
    isOpeningBalance: cv.isOpeningBalance,
    versionLabel: toCvVersionLabel(cv.code, version.number),
    status: version.status,
    cityName: cv.city.name,
    customerName: cv.customer.name,
    title: version.title,
    issuedOn: toDateInput(version.issuedOn),
    sellerIds: version.sellers.map((s) => s.userId),
    presalesId: version.presalesId,
    postsalesId: version.postsalesId,
    mainTechnologyId: version.mainTechnologyId,
    serviceTypeId: version.serviceTypeId,
    isNewTechnology: version.isNewTechnology,
    snapshot: parseCustomerSnapshot(version.customerSnapshot),
    endCustomerId: version.endCustomerId,
    customerPoNumber: version.customerPoNumber ?? "",
    customerPoDate: toDateInput(version.customerPoDate),
    paymentTerms: version.paymentTerms ?? "",
    deliveryOn: toDateInput(version.deliveryOn),
    notes: version.notes ?? "",
    costFxRate: toFxText(version.costFxRate),
    saleFxRate: toFxText(version.saleFxRate),
    officialFxRate: version.officialFxRate
      ? toFxText(version.officialFxRate)
      : null,
    revision: version.updatedAt.toISOString(),
  };
}
