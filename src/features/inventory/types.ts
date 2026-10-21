// src/features/inventory/types.ts
// Tipos de presentación del módulo de inventario (nunca entidades Prisma completas).
import type { WarehouseKind } from "@/generated/prisma/enums";

export type CityOption = { id: string; code: string; name: string };

export type WarehouseAdminView = {
  id: string;
  code: string;
  name: string;
  kind: WarehouseKind;
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  productsInStock: number;
};
