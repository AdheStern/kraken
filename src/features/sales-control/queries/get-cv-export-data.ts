// src/features/sales-control/queries/get-cv-export-data.ts
// Lee una versión de CV y la convierte en los datos de la exportación a Excel. No aplica authz: la ruta de
// descarga decide antes si el usuario puede exportar (AGENTS.md §2.9, "CV: exportar Excel").
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type {
  CvExportData,
  CvExportParty,
  CvExportSection,
} from "@/server/sales-control/export/cv-export-data";
import {
  type CustomerParty,
  parseCustomerSnapshot,
} from "../customer-snapshot";

const name = { select: { user: { select: { name: true } } } } as const;
const VERSION_INCLUDE = {
  cv: { select: { code: true, customer: { select: { name: true } } } },
  sellers: { select: { user: name } },
  presales: name,
  mainTechnology: { select: { name: true } },
  serviceType: { select: { name: true } },
  groups: { orderBy: { position: "asc" }, select: { id: true, name: true } },
  lines: {
    orderBy: { position: "asc" },
    include: {
      supplier: { select: { name: true } },
      technology: { select: { name: true } },
      area: { select: { code: true } },
      serials: { select: { serial: true } },
    },
  },
  leasingLines: {
    orderBy: { position: "asc" },
    include: {
      supplier: { select: { name: true } },
      technology: { select: { name: true } },
    },
  },
} satisfies Prisma.CvVersionInclude;

type VersionRow = Prisma.CvVersionGetPayload<{
  include: typeof VERSION_INCLUDE;
}>;

export async function getCvExportData(
  versionId: string,
): Promise<CvExportData | null> {
  const version = await prisma.cvVersion.findUnique({
    where: { id: versionId },
    include: VERSION_INCLUDE,
  });
  if (!version) return null;
  const snapshot = parseCustomerSnapshot(version.customerSnapshot) ?? {
    customer: emptyParty(version.cv.customer.name),
    endCustomer: null,
  };
  const areaCodes = version.lines.flatMap((line) =>
    line.area ? [line.area.code] : [],
  );

  return {
    versionLabel: toCvVersionLabel(version.cv.code, version.number),
    title: version.title,
    issuedOn: version.issuedOn,
    sellers: version.sellers.map((seller) => seller.user.user.name),
    presales: version.presales?.user.name ?? "",
    areas: [...new Set(areaCodes)].sort(),
    serviceType: version.serviceType?.name ?? "",
    mainTechnology: version.mainTechnology?.name ?? "",
    isNewTechnology: version.isNewTechnology,
    customer: toParty(snapshot.customer),
    // REGLA: el cliente final es por defecto el mismo cliente (AGENTS.md §2.1).
    endCustomer: toParty(snapshot.endCustomer ?? snapshot.customer),
    customerPoNumber: version.customerPoNumber ?? "",
    customerPoDate: version.customerPoDate,
    paymentTerms: version.paymentTerms ?? "",
    deliveryOn: version.deliveryOn,
    notes: version.notes ?? "",
    costFxRate: version.costFxRate.toString(),
    saleFxRate: version.saleFxRate.toString(),
    sections: toSections(version),
    leasing: version.leasingLines.map((line) => ({
      supplier: line.supplier?.name ?? "",
      technology: line.technology?.name ?? "",
      code: line.code ?? "",
      description: line.description,
      quantity: line.quantity.toString(),
      unitCostUsd: line.unitCostUsd.toFixed(2),
      notes: line.notes ?? "",
      poNumber: line.poNumber ?? "",
    })),
  };
}

function toSections(version: VersionRow): CvExportSection[] {
  const groups = [{ id: null, name: null }, ...version.groups];
  return groups
    .map((group) => ({
      groupName: group.name,
      rows: version.lines
        .filter((line) => line.groupId === group.id)
        .map((line) =>
          line.kind === "NOTA"
            ? {
                kind: "NOTA" as const,
                text: line.description,
                color: line.color,
              }
            : {
                kind: "ITEM" as const,
                supplier: line.supplier?.name ?? "",
                technology: line.technology?.name ?? "",
                code: line.code ?? "",
                description: line.description,
                quantity: line.quantity?.toString() ?? "",
                unitCostUsd: line.unitCostUsd?.toFixed(2) ?? "",
                unitSaleUsd: line.unitSaleUsd?.toFixed(2) ?? "",
                observations: observations(
                  line.notes,
                  line.serials.map((s) => s.serial),
                ),
                poNumber: line.poNumber ?? "",
                color: line.color,
              },
        ),
    }))
    .filter((section) => section.groupName !== null || section.rows.length > 0);
}

function observations(notes: string | null, serials: string[]): string {
  return [notes ?? "", serials.length > 0 ? `S/N: ${serials.join(", ")}` : ""]
    .filter(Boolean)
    .join("\n");
}

function emptyParty(name: string): CustomerParty {
  return {
    name,
    taxId: null,
    contactName: null,
    email: null,
    phone: null,
    address: null,
    city: null,
    country: null,
  };
}

function toParty(party: CustomerParty): CvExportParty {
  return {
    name: party.name,
    taxId: party.taxId ?? "",
    contact: party.contactName ?? "",
    email: party.email ?? "",
    phone: party.phone ?? "",
    address: party.address ?? "",
    cityCountry: [party.city, party.country].filter(Boolean).join(" - "),
  };
}
