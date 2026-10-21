// src/features/inventory/components/warehouse-row.tsx
// Un almacén: se lee en una línea (código, nombre, tipo, ciudad, productos con stock), se edita en el lugar
// (nombre y ciudad), se da de baja o se reactiva.
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { setWarehouseActive } from "../actions/set-warehouse-active";
import { upsertWarehouse } from "../actions/upsert-warehouse";
import type { CityOption, WarehouseAdminView } from "../types";
import { WAREHOUSE_KIND_LABELS } from "./warehouse-labels";

type Props = { warehouse: WarehouseAdminView; cities: CityOption[] };

export function WarehouseRow({ warehouse: w, cities }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: w.name, cityId: w.cityId });
  const isTransit = w.kind === "TRANSITO";

  async function run(action: () => Promise<ActionResult<unknown>>) {
    setIsPending(true);
    setError(null);
    const result = await action();
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setIsEditing(false);
    router.refresh();
  }

  return (
    <li className="grid gap-1 px-4 py-2">
      {isEditing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => upsertWarehouse({ id: w.id, ...draft }));
          }}
        >
          <Code value={w.code} />
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-label={`Nombre de ${w.name}`}
            className="h-9 min-w-40 flex-1"
          />
          {!isTransit && (
            <OptionSelect
              aria-label={`Ciudad de ${w.name}`}
              value={draft.cityId}
              options={cities.map((c) => ({ id: c.id, label: c.name }))}
              emptyLabel="Sin ciudad"
              onValueChange={(cityId) => setDraft({ ...draft, cityId })}
              className="h-9 w-44"
            />
          )}
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
            "flex flex-wrap items-center gap-2 text-sm",
            !w.isActive && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 flex-1 basis-56 items-center gap-2">
            <Code value={w.code} />
            <span className="truncate">{w.name}</span>
          </span>
          <span className="text-muted-foreground">
            {WAREHOUSE_KIND_LABELS[w.kind]}
            {w.cityName ? ` · ${w.cityName}` : ""}
            {" · "}
            <span className="tabular-nums">{stockText(w.productsInStock)}</span>
          </span>
          <span className="flex gap-1">
            {w.isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                aria-label={`Editar ${w.name}`}
              >
                Editar
              </Button>
            )}
            {!isTransit && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    setWarehouseActive({ id: w.id, isActive: !w.isActive }),
                  )
                }
                aria-label={`${w.isActive ? "Dar de baja" : "Reactivar"} ${w.name}`}
              >
                {w.isActive ? "Dar de baja" : "Reactivar"}
              </Button>
            )}
          </span>
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

function stockText(products: number): string {
  if (products === 0) return "sin stock";
  return products === 1
    ? "1 producto con stock"
    : `${products} productos con stock`;
}

function Code({ value }: { value: string }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
      {value}
    </span>
  );
}
