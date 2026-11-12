// src/features/admin/cv-customer-types.ts
// Tipos de presentación de la pantalla de cambio de cliente de un CV (§2.3, decisión 2026-11-12). Sin montos (§2.9).

export type CvCustomerRow = {
  id: string;
  code: string;
  title: string | null;
  versionNumber: number | null;
  statusLabel: string;
  isVoided: boolean;
  customer: { id: string; name: string; taxId: string | null };
  bagCount: number;
  // POR QUÉ: con una bolsa usada el cambio se rechaza; la pantalla lo dice antes de intentarlo.
  usedBagNotice: string | null;
};

export type CustomerChoice = { id: string; label: string; hint?: string };
