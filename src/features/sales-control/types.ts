// src/features/sales-control/types.ts
// Tipos de presentación del Control de Venta (nunca entidades Prisma completas; montos como texto).
import type { CvVersionStatus } from "@/generated/prisma/enums";
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
  versionLabel: string;
  status: CvVersionStatus;
  cityName: string;
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
};

export type CvEditorData = {
  header: CvEditorHeader;
  canEdit: boolean;
  canSeeCosts: boolean;
};
