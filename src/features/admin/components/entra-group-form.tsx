// src/features/admin/components/entra-group-form.tsx
// Alta de un mapeo grupo de Entra → rol + área. El área se pide o se oculta según el rol (role-area-rules.ts).
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RoleCode } from "@/generated/prisma/enums";
import { mapEntraGroup } from "../actions/map-entra-group";
import type { UserAdminOptions } from "../types";
import { LabeledInput } from "./labeled-input";
import { LabeledSelect } from "./labeled-select";
import { useAdminAction } from "./use-admin-action";

const EMPTY = { entraGroupId: "", groupName: "", areaId: "" };

export function EntraGroupForm({ options }: { options: UserAdminOptions }) {
  const { isPending, error, run } = useAdminAction();
  const [draft, setDraft] = useState(EMPTY);
  const [role, setRole] = useState<RoleCode>(
    options.roles[0]?.code ?? "INGENIERO",
  );
  const rule = options.roles.find((r) => r.code === role)?.areaRule ?? "NONE";
  const set = (patch: Partial<typeof draft>) =>
    setDraft({ ...draft, ...patch });

  async function add() {
    const areaId = rule === "NONE" ? null : draft.areaId;
    const ok = await run(() => mapEntraGroup({ ...draft, role, areaId }));
    if (ok) setDraft({ ...EMPTY, areaId: draft.areaId });
  }

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <LabeledInput
        label="Id. de objeto del grupo"
        value={draft.entraGroupId}
        placeholder="00000000-0000-0000-0000-000000000000"
        onChange={(entraGroupId) => set({ entraGroupId })}
      />
      <LabeledInput
        label="Nombre del grupo"
        value={draft.groupName}
        placeholder="KRAKEN-INGENIERO-DIMANET"
        onChange={(groupName) => set({ groupName })}
      />
      <LabeledSelect
        label="Rol"
        value={role}
        options={options.roles.map((r) => ({ id: r.code, label: r.name }))}
        onChange={(code) => setRole(code as RoleCode)}
      />
      {rule === "NONE" ? (
        <p className="pb-2 text-sm text-muted-foreground">
          Rige en toda la empresa.
        </p>
      ) : (
        <LabeledSelect
          label={rule === "REQUIRED" ? "Área" : "Área (opcional)"}
          value={draft.areaId}
          options={options.areas}
          emptyLabel={rule === "REQUIRED" ? "Elige el área" : "Sin área"}
          onChange={(areaId) => set({ areaId })}
        />
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Plus aria-hidden="true" />
        )}
        Mapear
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-full">
          {error}
        </p>
      )}
    </form>
  );
}
