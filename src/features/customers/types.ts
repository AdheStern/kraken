// src/features/customers/types.ts
// Tipos de presentación del directorio de contactos y de la ficha de la persona (decisión 2026-11-06).
import type { CustomerContactView } from "@/features/admin/types";

export type ContactFilters = {
  query: string;
  customerId: string | null;
  areaId: string | null;
  userId: string | null;
  onlyActive: boolean;
};

export type DirectoryContact = CustomerContactView & {
  customerId: string;
  customerName: string;
};

export type ContactPersonView = {
  id: string;
  name: string;
  // Correo y teléfono personales: solo para quien gestiona el catálogo.
  personalEmail: string | null;
  personalPhone: string | null;
  positions: DirectoryContact[];
};
