// src/features/sales-control/components/header/header-section.tsx
// Grupo con título dentro de la cabecera del CV (Identificación, Personas, Cliente…).
import type { ReactNode } from "react";

export function HeaderSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-4 border-t pt-5 first:border-t-0 first:pt-0 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="mb-1 text-sm font-semibold sm:col-span-2 lg:col-span-4">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
