// src/features/sales-control/types.ts
// Tipos de presentación del Control de Venta (nunca entidades Prisma completas; montos como texto).

import type { LineComparison } from "@/domain/sales-control/compare-versions";
import type { ApprovalStatus, CvVersionStatus } from "@/generated/prisma/enums";
import type { CustomerSnapshot } from "./customer-snapshot";

export type Option = { id: string; label: string; hint?: string };

export type CvFormOptions = {
  cities: Option[];
  customers: Option[];
  technologies: Option[];
  serviceTypes: Option[];
  people: Option[];
};

export type CvListRow = {
  id: string;
  code: string;
  isOpeningBalance: boolean;
  versionLabel: string;
  title: string;
  customerName: string;
  cityCode: string;
  status: CvVersionStatus;
  totalSaleUsd: string;
  updatedAt: string;
};

export type CvEditorHeader = {
  cvId: string;
  versionId: string;
  code: string;
  isOpeningBalance: boolean;
  versionLabel: string;
  status: CvVersionStatus;
  cityName: string;
  customerId: string;
  customerName: string;
  title: string;
  issuedOn: string;
  sellerIds: string[];
  presalesId: string | null;
  postsalesId: string | null;
  mainTechnologyId: string | null;
  serviceTypeId: string | null;
  isNewTechnology: boolean;
  snapshot: CustomerSnapshot | null;
  endCustomerId: string | null;
  customerPoNumber: string;
  customerPoDate: string;
  paymentTerms: string;
  deliveryOn: string;
  notes: string;
  costFxRate: string;
  saleFxRate: string;
  officialFxRate: string | null;
  revision: string;
};

export type CvVersionSummary = {
  id: string;
  number: number;
  label: string;
  status: CvVersionStatus;
  reason: string | null;
  createdByName: string;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
};

export type CvApprovalItem = {
  id: string;
  label: string;
  status: ApprovalStatus;
  comment: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  canDecide: boolean;
};

export type CvEditorData = {
  header: CvEditorHeader;
  canEdit: boolean;
  canSeeCosts: boolean;
  canExport: boolean;
  versionNumber: number;
  isLatest: boolean;
  latestStatus: CvVersionStatus;
  canManage: boolean;
  versions: CvVersionSummary[];
  approvals: CvApprovalItem[];
};

export type ProductOption = {
  id: string;
  code: string;
  description: string;
  technologyId: string | null;
  unitId: string | null;
  itemType: "HARDWARE" | "INTANGIBLE" | "SERVICIO";
};

export type CvGridOptions = {
  areas: Option[];
  suppliers: Option[];
  technologies: Option[];
  units: (Option & { isHours: boolean; isTerm: boolean })[];
  products: ProductOption[];
  // POR QUÉ: proyectos activos del cliente del CV, para el alcance PROYECTO de una bolsa (§2.4).
  projects: Option[];
};

export type CvComparisonData = {
  cvId: string;
  fromLabel: string;
  toLabel: string;
  rows: LineComparison[];
  totals: { label: string; before: string; after: string; diff: string }[];
};

export type CvHoursView = {
  label: string;
  title: string;
  customerName: string;
  cityName: string;
  sellerNames: string[];
  lines: {
    id: string;
    description: string;
    hours: string;
    areaCode: string | null;
    modality: "H8X5" | "H24X7" | null;
    expiresOn: string | null;
    bag: {
      id: string;
      status: "ACTIVA" | "AGOTADA" | "VENCIDA" | "CERRADA";
      balanceMinutes: number;
    } | null;
  }[];
};

export type PendingApprovalItem = {
  requestId: string;
  cvId: string;
  versionNumber: number;
  versionLabel: string;
  title: string;
  customerName: string;
  totalSaleUsd: string;
  areaCodes: string[];
  requestLabel: string;
  submittedAt: string;
};
