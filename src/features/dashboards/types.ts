// src/features/dashboards/types.ts
// Tipos de presentación de los tableros (nunca entidades Prisma completas). Montos como texto con 2 decimales
// para no pasar por number (regla 3); tiempo en minutos enteros (regla 4).
import type { SalesDimension } from "@/domain/dashboards/sales-breakdown";

export type MoneyKpi = {
  valueUsd: string;
  previousUsd: string;
  variationPct: number | null;
  goalUsd: string | null;
  progressPct: number | null;
};

export type MinutesKpi = {
  minutes: number;
  previousMinutes: number;
  variationPct: number | null;
  goalMinutes: number | null;
  progressPct: number | null;
};

export type SalesBreakdownRow = {
  key: string | null;
  label: string;
  saleUsd: string;
  marginUsd: string;
  marginPct: string | null;
  cvCount: number;
  sharePct: number | null;
};

export type SalesMonth = {
  month: string;
  saleUsd: string;
  goalUsd: string | null;
};

export type SalesDashboard = {
  periodLabel: string;
  previousLabel: string;
  sales: MoneyKpi;
  margin: MoneyKpi & { marginPct: string | null };
  factor: string | null;
  ownServicesUsd: string;
  hoursSold: MinutesKpi;
  cvCount: number;
  monthly: SalesMonth[];
  breakdown: { dimension: SalesDimension; rows: SalesBreakdownRow[] };
};

export type PipelineStage = {
  status: "BORRADOR" | "EN_APROBACION" | "OBSERVADA";
  cvCount: number;
  saleUsd: string;
};

export type RenewalItem = {
  lineId: string;
  cvId: string;
  cvLabel: string;
  customerName: string;
  description: string;
  coverageEnd: string;
  daysLeft: number;
  saleUsd: string;
};

export type RenewalsView = {
  bands: { days: 30 | 60 | 90; count: number; saleUsd: string }[];
  items: RenewalItem[];
};

export type ApprovalTimes = {
  approvedCount: number;
  medianMinutes: number | null;
  oldestPending: {
    cvId: string;
    versionLabel: string;
    customerName: string;
    requestLabel: string;
    waitingMinutes: number;
  } | null;
};
