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

export type CustomerRow = {
  id: string;
  name: string;
  taxId: string | null;
  city: string | null;
  contactCount: number;
  isActive: boolean;
};

export type CustomerContactView = {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type CustomerDetail = {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  contacts: CustomerContactView[];
};
