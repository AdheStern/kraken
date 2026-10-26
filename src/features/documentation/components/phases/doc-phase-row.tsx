// src/features/documentation/components/phases/doc-phase-row.tsx
// Una fase de documentación: se reordena, se renombra en el lugar, se da de baja o se reactiva.
"use client";

import { ArrowDown, ArrowUp, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { moveDocPhase } from "../../actions/move-doc-phase";
import { setDocPhaseActive } from "../../actions/set-doc-phase-active";
import { upsertDocPhase } from "../../actions/upsert-doc-phase";
import type { DocPhaseItem } from "../../types";
import { useDocAction } from "../use-doc-action";

// POR QUÉ: position es la que ve el usuario entre las activas; null en las dadas de baja.
type Props = { phase: DocPhaseItem; position: number | null; isLast: boolean };

export function DocPhaseRow({ phase, position, isLast }: Props) {
  const { isPending, error, run } = useDocAction();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(phase.name);
  const move = (direction: "up" | "down") =>
    run(() => moveDocPhase({ id: phase.id, direction }));
  const toggle = () =>
    run(() => setDocPhaseActive({ id: phase.id, isActive: !phase.isActive }));

  return (
    <li className="grid gap-1 px-4 py-2">
      {isEditing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await run(() => upsertDocPhase({ id: phase.id, name })))
              setIsEditing(false);
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`Nombre de ${phase.name}`}
            className="h-9 min-w-40 flex-1"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Guardar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 text-sm",
            !phase.isActive && "text-muted-foreground",
          )}
        >
          {position !== null && (
            <span className="w-6 text-right tabular-nums text-muted-foreground">
              {position}.
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{phase.name}</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {phase.documentCount === 1
              ? "1 documento"
              : `${phase.documentCount} documentos`}
          </span>
          {position !== null && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending || position === 1}
                onClick={() => move("up")}
                aria-label={`Subir ${phase.name}`}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending || isLast}
                onClick={() => move("down")}
                aria-label={`Bajar ${phase.name}`}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                aria-label={`Editar ${phase.name}`}
              >
                Editar
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={toggle}
            aria-label={`${phase.isActive ? "Dar de baja" : "Reactivar"} ${phase.name}`}
          >
            {phase.isActive ? "Dar de baja" : "Reactivar"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
