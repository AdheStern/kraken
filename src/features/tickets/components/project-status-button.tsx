// src/features/tickets/components/project-status-button.tsx
// Cierra o reactiva un proyecto desde su fila.
"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProjectStatus } from "../actions/set-project-status";
import { useTicketAction } from "./use-ticket-action";

type Props = { projectId: string; status: "ACTIVO" | "CERRADO" };

export function ProjectStatusButton({ projectId, status }: Props) {
  const { run, isPending, error } = useTicketAction();
  const next = status === "ACTIVO" ? "CERRADO" : "ACTIVO";
  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => run(() => setProjectStatus({ projectId, status: next }))}
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        {status === "ACTIVO" ? "Cerrar" : "Reactivar"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
