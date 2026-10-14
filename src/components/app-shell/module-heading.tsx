// src/components/app-shell/module-heading.tsx
// Título de un módulo con el nodo de la red del riel: cada pantalla se lee como un nodo de la misma red (DESIGN.md).
import type { ReactNode } from "react";

type Props = { title: string; description?: ReactNode; actions?: ReactNode };

export function ModuleHeading({ title, description, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-2 grid size-4 shrink-0 place-items-center rounded-full border-[3px] border-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
        >
          <span className="size-1 rounded-full bg-primary" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions}
    </header>
  );
}
