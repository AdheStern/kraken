// src/features/sales-control/components/lines/post-sale-toolbar.tsx
// Barra de las líneas de una versión aprobada: solo guarda los datos posventa (observaciones, PO#, activación y
// seriales; AGENTS.md §2.3).
"use client";

import { LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
};

export function PostSaleToolbar({ isDirty, isSaving, onSave }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-base font-semibold">Líneas</h2>
      <p className="mr-auto text-sm text-muted-foreground">
        Versión aprobada: puedes completar observaciones, PO#, rango de
        activación y seriales. Los montos no cambian.
      </p>
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
