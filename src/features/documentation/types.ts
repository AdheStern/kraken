// src/features/documentation/types.ts
// Tipos de presentación de la documentación por proyecto (AGENTS.md §2.10).

export type DocPhaseItem = {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  documentCount: number;
};
