// src/features/help/tours/tour-types.ts
// Forma de un recorrido guiado: pasos con el elemento que señalan (selector CSS) y su texto (decisión 2026-11-05).

export type TourStep = {
  element?: string;
  title: string;
  description: string;
};

export type TourDefinition = { title: string; steps: TourStep[] };

export const at = (name: string) => `[data-tour="${name}"]`;
