// src/features/hours/components/bag-labels.ts
// Textos de interfaz de las bolsas: modalidad, alcance, estado, movimientos y vencimiento.
import type {
  BagModality,
  BagScope,
  BagStatus,
  HourMovementKind,
} from "@/generated/prisma/enums";
import type { BagSummary } from "../types";

export const MODALITY_LABELS: Record<BagModality, string> = {
  H8X5: "8x5",
  H24X7: "24x7",
};

export const SCOPE_LABELS: Record<BagScope, string> = {
  AREA: "Área",
  PROYECTO: "Proyecto",
  GENERAL: "General",
};

export const STATUS_LABELS: Record<BagStatus, string> = {
  ACTIVA: "Activa",
  AGOTADA: "Agotada",
  VENCIDA: "Vencida",
  CERRADA: "Cerrada",
};

export const MOVEMENT_LABELS: Record<HourMovementKind, string> = {
  APERTURA: "Apertura",
  CONSUMO: "Consumo",
  REVERSO: "Reverso",
  AJUSTE: "Ajuste",
  VENCIMIENTO: "Vencimiento",
};

const civilDate = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatCivilDate(date: string): string {
  return civilDate.format(new Date(`${date}T00:00:00Z`));
}

export function scopeText(bag: Pick<BagSummary, "scope" | "areaCodes">) {
  const areas = bag.areaCodes.join(" / ");
  return bag.scope === "AREA" ? areas : `${SCOPE_LABELS[bag.scope]} · ${areas}`;
}

export function expiryText(
  bag: Pick<BagSummary, "expiresOn" | "daysToExpiry">,
): string {
  const { expiresOn, daysToExpiry } = bag;
  if (!expiresOn || daysToExpiry === null) return "Sin vencimiento";
  if (daysToExpiry < 0) return `Venció el ${formatCivilDate(expiresOn)}`;
  if (daysToExpiry === 0) return "Vence hoy";
  if (daysToExpiry === 1) return "Vence mañana";
  if (daysToExpiry <= 60) return `Vence en ${daysToExpiry} días`;
  return `Vence el ${formatCivilDate(expiresOn)}`;
}
