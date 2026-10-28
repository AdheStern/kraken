// src/features/admin/components/simple-catalog-row.tsx
// Un registro de catálogo simple: se lee en una línea, se edita en el lugar, se da de baja o se reactiva.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setSimpleCatalogItemActive } from "../actions/set-simple-catalog-item-active";
import { upsertSimpleCatalogItem } from "../actions/upsert-simple-catalog-item";
import type { SimpleCatalogKind } from "../simple-catalogs";
import type { SimpleCatalogItem } from "../types";
import { SimpleCatalogFields } from "./simple-catalog-fields";
import { useAdminAction } from "./use-admin-action";

type Props = { kind: SimpleCatalogKind; item: SimpleCatalogItem };

export function SimpleCatalogRow({ kind, item }: Props) {
  const { isPending, error, run } = useAdminAction();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name,
    taxId: item.taxId ?? "",
    isHours: item.isHours ?? false,
    isTerm: item.isTerm ?? false,
  });
  const toggle = () =>
    run(() =>
      setSimpleCatalogItemActive({
        kind,
        id: item.id,
        isActive: !item.isActive,
      }),
    );

  return (
    <li className="grid gap-1 px-4 py-2">
      {isEditing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const saved = await run(() =>
              upsertSimpleCatalogItem({ kind, id: item.id, ...draft }),
            );
            if (saved) setIsEditing(false);
          }}
        >
          {item.code && <Code value={item.code} />}
          <SimpleCatalogFields
            kind={kind}
            draft={draft}
            onChange={setDraft}
            label={`de ${item.name}`}
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
            !item.isActive && "text-muted-foreground",
          )}
        >
          {item.code && <Code value={item.code} />}
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
          {item.taxId && (
            <span className="tabular-nums text-muted-foreground">
              NIT {item.taxId}
            </span>
          )}
          {item.isHours && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Unidad de horas
            </span>
          )}
          {item.isTerm && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Unidad de plazo
            </span>
          )}
          {item.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              aria-label={`Editar ${item.name}`}
            >
              Editar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={toggle}
            aria-label={`${item.isActive ? "Dar de baja" : "Reactivar"} ${item.name}`}
          >
            {item.isActive ? "Dar de baja" : "Reactivar"}
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

function Code({ value }: { value: string }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
      {value}
    </span>
  );
}
