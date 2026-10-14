// src/features/admin/components/user-status-button.tsx
// Da de baja (cierra sus sesiones) o reactiva a un usuario desde su ficha; nadie se da de baja a sí mismo.
"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setUserActive } from "../actions/set-user-active";
import { useAdminAction } from "./use-admin-action";

type Props = { userId: string; isActive: boolean; isSelf: boolean };

export function UserStatusButton({ userId, isActive, isSelf }: Props) {
  const { isPending, error, run } = useAdminAction();
  if (isSelf && isActive) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          run(() => setUserActive({ userId, isActive: !isActive }))
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
