// src/features/search/types.ts
// Tipos de presentación de la búsqueda global (Ctrl+K): grupos con hasta 5 resultados, cada uno con su enlace.

export type SearchItem = {
  id: string;
  label: string;
  hint: string | null;
  href: string;
};

export type SearchGroup = { label: string; items: SearchItem[] };
