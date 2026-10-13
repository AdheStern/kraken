// src/features/sales-control/queries/get-cv-editor.ts
// Datos del editor de un CV visible para el usuario: cabecera de la versión vigente de trabajo y permisos.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { canEditCvDraft, canSeeCvCosts } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import { parseCustomerSnapshot } from "../customer-snapshot";
import type { CvEditorData } from "../types";
import { loadCvAccess } from "./load-cv-access";

const toDateInput = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : "";

// REGLA: el TC se muestra con 2 decimales salvo que tenga más (AGENTS.md §15.4).
const toFxText = (rate: {
  decimalPlaces: () => number;
  toFixed: (dp: number) => string;
}) => rate.toFixed(Math.max(2, rate.decimalPlaces()));

export async function getCvEditor(
  user: SessionUser,
  cvId: string,
): Promise<CvEditorData | null> {
  const cv = await prisma.cv.findFirst({
    where: { AND: [scopeCvQuery(user), { id: cvId }] },
    select: {
      id: true,
      code: true,
      city: { select: { name: true } },
      customer: { select: { name: true } },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        include: { sellers: { select: { userId: true } } },
      },
    },
  });
  const version = cv?.versions[0];
  if (!cv || !version) return null;
  const access = await loadCvAccess(cv.id, version.id);
  if (!access) return null;

  return {
    canEdit: version.status === "BORRADOR" && canEditCvDraft(user, access),
    canSeeCosts: canSeeCvCosts(user, access),
    header: {
      cvId: cv.id,
      versionId: version.id,
      code: cv.code,
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
    },
  };
}
