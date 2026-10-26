// src/features/help/types.ts
// Forma de un manual corto por rol (AGENTS.md §12 F6 "Manuales cortos por rol"): texto plano y enlaces internos.

export type ManualSection = {
  heading: string;
  steps: readonly string[];
  link?: { href: string; label: string };
};

export type Manual = {
  title: string;
  summary: string;
  sections: readonly ManualSection[];
};
