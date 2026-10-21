// src/features/inventory/components/new-warehouse.tsx
// Alta en línea de un almacén: código, nombre, tipo y ciudad (obligatoria si es físico).
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { upsertWarehouse } from "../actions/upsert-warehouse";
import { CREATABLE_WAREHOUSE_KINDS } from "../schemas/warehouse-schemas";
import type { CityOption } from "../types";
import { WAREHOUSE_KIND_LABELS } from "./warehouse-labels";

type Kind = (typeof CREATABLE_WAREHOUSE_KINDS)[number];

const KIND_OPTIONS = CREATABLE_WAREHOUSE_KINDS.map((kind) => ({
  id: kind,
  label: WAREHOUSE_KIND_LABELS[kind],
}));

const EMPTY = {
  code: "",
  name: "",
  kind: "FISICO" as Kind,
  cityId: null as string | null,
};

export function NewWarehouse({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(EMPTY);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setIsPending(true);
    setError(null);
    const result = await upsertWarehouse({ id: null, ...draft });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setDraft(EMPTY);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <form
        className="kr-surface flex flex-wrap items-center gap-2 rounded-xl p-3"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Input
          value={draft.code}
          placeholder="Código"
          onChange={(e) =>
            setDraft({ ...draft, code: e.target.value.toUpperCase() })
          }
          aria-label="Código del almacén nuevo"
          title="De 2 a 12 letras, números o guiones; no cambia después."
          className="h-9 w-28 font-mono uppercase"
        />
        <Input
          value={draft.name}
          placeholder="Nombre"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Nombre del almacén nuevo"
          className="h-9 min-w-40 flex-1"
        />
        <OptionSelect
          aria-label="Tipo del almacén nuevo"
          value={draft.kind}
          options={KIND_OPTIONS}
          onValueChange={(kind) =>
            setDraft({ ...draft, kind: (kind ?? "FISICO") as Kind })
          }
          className="h-9 w-40"
        />
        <OptionSelect
          aria-label="Ciudad del almacén nuevo"
          value={draft.cityId}
          options={cities.map((c) => ({ id: c.id, label: c.name }))}
          emptyLabel="Sin ciudad"
          onValueChange={(cityId) => setDraft({ ...draft, cityId })}
          className="h-9 w-44"
        />
        <Button type="submit" size="sm" className="h-9" disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Agregar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
