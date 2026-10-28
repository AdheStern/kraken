// src/features/hours/types.ts
// Tipos de presentación de las bolsas de horas (nunca entidades Prisma; tiempo en minutos enteros, sin montos).
import type {
  BagRiskGroup,
  BagRiskReason,
} from "@/domain/hours/classify-bag-risk";
import type {
  BagKind,
  BagModality,
  BagScope,
  BagStatus,
  HourMovementKind,
} from "@/generated/prisma/enums";

export type BagSummary = {
  id: string;
  cvId: string;
  cvLabel: string;
  lineDescription: string;
  customerId: string;
  customerName: string;
  kind: BagKind;
  // POR QUÉ: sin tope, balanceMinutes es lo usado en negativo y no se muestra como saldo (§2.4).
  isUncapped: boolean;
  startsOn: string | null;
  modality: BagModality;
  scope: BagScope;
  areaCodes: string[];
  status: BagStatus;
  soldMinutes: number;
  consumedMinutes: number;
  expiredMinutes: number;
  balanceMinutes: number;
  consumedPct: number;
  expiresOn: string | null;
  daysToExpiry: number | null;
  riskGroup: BagRiskGroup;
  riskReasons: BagRiskReason[];
};

export type BagLedgerEntry = {
  id: string;
  kind: HourMovementKind;
  minutes: number;
  balanceAfter: number;
  createdAt: string;
  reason: string | null;
  actorName: string;
  ticketId: string | null;
  ticketNumber: number | null;
};

export type BagDetail = {
  bag: BagSummary;
  ledger: BagLedgerEntry[];
  canAdjust: boolean;
};

export type BagFilters = { customerId?: string; status?: BagStatus };
