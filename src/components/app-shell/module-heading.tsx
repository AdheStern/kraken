// src/components/app-shell/module-heading.tsx
// Título de un módulo con el nodo de la red del riel: cada pantalla se lee como un nodo de la misma red (DESIGN.md).
import type { ReactNode } from "react";
import { PageTour } from "@/features/help/components/page-tour";
import type { TourId } from "@/features/help/tours/tour-registry";
import { NodeMark } from "./node-mark";

type Props = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  // Recorrido guiado de la pantalla (decisión 2026-11-05).
  tour?: TourId;
};

export function ModuleHeading({ title, description, actions, tour }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <NodeMark className="mt-2" />
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {(actions || tour) && (
        <div className="flex flex-wrap items-center gap-2">
          {tour && <PageTour id={tour} />}
          {actions}
        </div>
      )}
    </header>
  );
}
