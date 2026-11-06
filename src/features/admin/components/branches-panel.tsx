// src/features/admin/components/branches-panel.tsx
// Sucursales o subdirecciones de un cliente en otras ciudades: alta, edición y baja (decisión 2026-11-06).
"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setCustomerBranchActive } from "../actions/set-customer-branch-active";
import type { CustomerBranchView, CustomerFormOptions } from "../types";
import { BranchDialog } from "./branch-dialog";
import { useAdminAction } from "./use-admin-action";

type Props = {
  customerId: string;
  branches: CustomerBranchView[];
  municipalities: CustomerFormOptions["municipalities"];
};

export function BranchesPanel({ customerId, branches, municipalities }: Props) {
  const { isPending, error, run } = useAdminAction();
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <BranchDialog
          customerId={customerId}
          municipalities={municipalities}
          trigger={
            <Button size="sm">
              <Plus aria-hidden="true" />
              Nueva sucursal
            </Button>
          }
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {branches.length === 0 ? (
        <KrakenEmpty compact title="Este cliente no tiene sucursales cargadas.">
          Agrega sus oficinas, plantas o subdirecciones en otras ciudades; sus
          contactos se podrán asociar a cada una.
        </KrakenEmpty>
      ) : (
        <ul className="kr-surface divide-y divide-border/60 rounded-xl">
          {branches.map((b) => (
            <li
              key={b.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                !b.isActive && "text-muted-foreground",
              )}
            >
              <MapPin
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {b.name}
                  {!b.isActive && " (dada de baja)"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[b.municipalityLabel, b.address, b.phone]
                    .filter(Boolean)
                    .join(" · ") || "Sin dirección"}
                </p>
              </div>
              <BranchDialog
                customerId={customerId}
                branch={b}
                municipalities={municipalities}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${b.name}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    setCustomerBranchActive({
                      id: b.id,
                      isActive: !b.isActive,
                    }),
                  )
                }
              >
                {b.isActive ? "Dar de baja" : "Reactivar"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
