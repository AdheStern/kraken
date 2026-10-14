// src/features/admin/components/customer-status-button.tsx
// Da de baja o reactiva un cliente desde su ficha.
"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCustomerActive } from "../actions/set-customer-active";
import { useAdminAction } from "./use-admin-action";

type Props = { id: string; isActive: boolean };

export function CustomerStatusButton({ id, isActive }: Props) {
  const { isPending, error, run } = useAdminAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          run(() => setCustomerActive({ id, isActive: !isActive }))
        }
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        {isActive ? "Dar de baja" : "Reactivar"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
