// src/features/sales-control/components/lines/post-sale-toolbar.tsx
// Barra de las líneas fuera del borrador: guarda los datos posventa de la versión aprobada (observaciones, PO#, BC,
// activación y seriales) y GROSS UP y RET DIMA, que se corrigen en cualquier estado (AGENTS.md §2.3).
"use client";

import { LoaderCircle, Save } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { LineEditRights } from "./item-cell-context";

type Props = {
  rights: LineEditRights;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  columnsMenu: ReactNode;
};

export function PostSaleToolbar({
  rights,
  isDirty,
  isSaving,
  onSave,
  columnsMenu,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-base font-semibold">Líneas</h2>
      <p className="mr-auto text-sm text-muted-foreground">{message(rights)}</p>
      {columnsMenu}
      <Button size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
        {isSaving ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Save aria-hidden="true" />
        )}
        Guardar
      </Button>
    </div>
  );
}

function message({ canEditPostSale, canEditWithholdings }: LineEditRights) {
  if (!canEditPostSale)
    return "Puedes corregir GROSS UP y RET DIMA. Los demás datos no cambian.";
  return canEditWithholdings
    ? "Versión aprobada: puedes completar observaciones, PO#, BC, GROSS UP, RET DIMA, rango de activación y seriales. Los precios no cambian."
    : "Versión aprobada: puedes completar observaciones, PO#, BC, rango de activación y seriales. Los montos no cambian.";
}
