// src/features/admin/components/product-labels.ts
// Nombres en pantalla del tipo de ítem de un producto (AGENTS.md §2.1).
import type { ItemTypeCode } from "../types";

export const ITEM_TYPE_LABELS: Record<ItemTypeCode, string> = {
  HARDWARE: "Hardware",
  INTANGIBLE: "Intangible",
  SERVICIO: "Servicio",
};
