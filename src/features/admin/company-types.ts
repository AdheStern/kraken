// src/features/admin/company-types.ts
// Tipos de empresa del cliente con su nombre en la interfaz (decisión 2026-11-06).
import type { CompanyType } from "@/generated/prisma/enums";

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  PUBLICA: "Pública",
  PRIVADA: "Privada",
  MIXTA: "Mixta",
  ONG: "ONG o fundación",
  ORGANISMO_INTERNACIONAL: "Organismo internacional",
  OTRA: "Otra",
};

export const COMPANY_TYPES = Object.keys(COMPANY_TYPE_LABELS) as CompanyType[];
