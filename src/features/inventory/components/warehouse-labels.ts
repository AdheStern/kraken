// src/features/inventory/components/warehouse-labels.ts
// Nombres en la interfaz de los tipos de almacén (AGENTS.md §2.8).
import type { WarehouseKind } from "@/generated/prisma/enums";

export const WAREHOUSE_KIND_LABELS: Record<WarehouseKind, string> = {
  FISICO: "Físico",
  TRANSITO: "En tránsito",
  DEMOSTRACION: "Demostración",
  REPUESTOS: "Repuestos",
};
