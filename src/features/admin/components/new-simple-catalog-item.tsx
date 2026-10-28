// src/features/admin/components/new-simple-catalog-item.tsx
// Alta en línea de un registro de catálogo simple; pide el código solo en los catálogos que lo llevan.
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertSimpleCatalogItem } from "../actions/upsert-simple-catalog-item";
import { SIMPLE_CATALOGS, type SimpleCatalogKind } from "../simple-catalogs";
import { SimpleCatalogFields, type SimpleDraft } from "./simple-catalog-fields";
import { useAdminAction } from "./use-admin-action";

const EMPTY: SimpleDraft = {
  name: "",
  taxId: "",
  isHours: false,
  isTerm: false,
};

export function NewSimpleCatalogItem({ kind }: { kind: SimpleCatalogKind }) {
  const config = SIMPLE_CATALOGS[kind];
  const { isPending, error, run } = useAdminAction();
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState(EMPTY);

  async function add() {
    const saved = await run(() =>
      upsertSimpleCatalogItem({ kind, id: null, code, ...draft }),
    );
    if (!saved) return;
    setCode("");
    setDraft(EMPTY);
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
        {config.code && (
          <Input
            value={code}
            placeholder={config.code.label}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label={`${config.code.label} del nuevo registro`}
            title={config.code.hint}
            className="h-9 w-28 font-mono uppercase"
          />
        )}
        <SimpleCatalogFields
          kind={kind}
          draft={draft}
          onChange={setDraft}
          label="del nuevo registro"
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
