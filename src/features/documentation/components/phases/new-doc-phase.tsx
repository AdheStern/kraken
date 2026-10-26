// src/features/documentation/components/phases/new-doc-phase.tsx
// Alta en línea de una fase de documentación; entra al final del orden.
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertDocPhase } from "../../actions/upsert-doc-phase";
import { useDocAction } from "../use-doc-action";

export function NewDocPhase() {
  const { isPending, error, run } = useDocAction();
  const [name, setName] = useState("");

  async function add() {
    if (await run(() => upsertDocPhase({ id: null, name }))) setName("");
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
          value={name}
          placeholder="Nombre de la fase"
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre de la nueva fase"
          className="h-9 min-w-40 flex-1"
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
