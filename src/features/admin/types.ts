// src/features/admin/types.ts
// Tipos de presentación de la administración (nunca entidades Prisma completas).

export type SimpleCatalogItem = {
  id: string;
  name: string;
  code: string | null;
  taxId: string | null;
  isHours: boolean | null;
  isActive: boolean;
};
