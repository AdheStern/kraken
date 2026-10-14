// src/features/admin/components/entra-group-list.tsx
// Grupos de Entra mapeados: cada grupo con los roles que da y cuántas personas tienen hoy ese rol desde Entra.
"use client";

import { X } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import { unmapEntraGroup } from "../actions/unmap-entra-group";
import type { EntraGroupView } from "../types";
import { useAdminAction } from "./use-admin-action";

export function EntraGroupList({ groups }: { groups: EntraGroupView[] }) {
  const { isPending, error, run } = useAdminAction();
  if (groups.length === 0)
    return (
      <KrakenEmpty compact title="Todavía no hay grupos mapeados.">
        Mientras tanto, los roles se asignan a mano en Usuarios y roles. Mapea
        un grupo y quienes estén en él recibirán su rol al iniciar sesión.
      </KrakenEmpty>
    );
  return (
    <div className="grid gap-2">
      <ul className="kr-surface divide-y divide-border/60 rounded-xl">
        {groups.map((g) => (
          <li key={g.entraGroupId} className="grid gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{g.groupName}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {g.entraGroupId}
              </p>
            </div>
            <ul className="grid gap-1">
              {g.roles.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
                >
                  <span className="mr-auto rounded-md bg-muted px-2 py-0.5 text-xs sm:mr-0">
                    {r.roleName}
                    {r.areaCode && (
                      <span className="ml-1 font-medium text-primary">
                        {r.areaCode}
                      </span>
                    )}
                  </span>
                  <span className="order-last w-full text-xs text-muted-foreground sm:order-none sm:w-auto sm:flex-1">
                    {r.people === 1
                      ? "1 persona lo tiene desde Entra"
                      : `${r.people} personas lo tienen desde Entra`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    aria-label={`Quitar ${r.roleName}${r.areaCode ? ` ${r.areaCode}` : ""} de ${g.groupName}`}
                    onClick={() => run(() => unmapEntraGroup({ id: r.id }))}
                  >
                    <X aria-hidden="true" />
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
