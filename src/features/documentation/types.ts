// src/features/documentation/types.ts
// Tipos de presentación de la documentación por proyecto (AGENTS.md §2.10).
import type { CatalogOption } from "@/components/forms/catalog-combobox";
import type { UpdateDocProjectInput } from "./schemas/doc-project-schema";

export type DocPhaseItem = {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  documentCount: number;
};

// POR QUÉ: el contacto del catálogo prellena nombre, correo y teléfono, que quedan editables (§2.10).
export type DocContactOption = CatalogOption & {
  customerId: string;
  name: string;
  email: string;
  phone: string;
};

export type DocProjectFormOptions = {
  customers: CatalogOption[];
  contacts: DocContactOption[];
  technologies: CatalogOption[];
  people: CatalogOption[];
};

export type DocProjectSummary = {
  id: string;
  name: string;
  customerName: string;
  ownerName: string;
  technologies: string[];
  documentCount: number;
  updatedAt: string;
};

export type DocProjectDetail = {
  id: string;
  name: string;
  customerName: string;
  ownerName: string;
  technologies: string[];
  header: UpdateDocProjectInput;
};
