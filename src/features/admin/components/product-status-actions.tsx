// src/features/admin/components/product-status-actions.tsx
// Acciones de estado de un producto en su ficha: darlo por revisado (si vino de un CV o un ingreso) y baja o reactivación.
"use client";

import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markProductReviewed } from "../actions/mark-product-reviewed";
import { setProductActive } from "../actions/set-product-active";
import { useAdminAction } from "./use-admin-action";

type Props = { id: string; isActive: boolean; isToReview: boolean };

export function ProductStatusActions({ id, isActive, isToReview }: Props) {
  const { isPending, error, run } = useAdminAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {isToReview && isActive && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(() => markProductReviewed({ id }))}
          >
            {isPending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            Dar por revisado
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(() => setProductActive({ id, isActive: !isActive }))
          }
        >
          {isActive ? "Dar de baja" : "Reactivar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
