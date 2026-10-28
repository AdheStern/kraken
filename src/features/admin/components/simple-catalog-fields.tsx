// src/features/admin/components/simple-catalog-fields.tsx
// Campos editables de un registro de catálogo simple (nombre, NIT, marca de horas) según su configuración.
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIMPLE_CATALOGS, type SimpleCatalogKind } from "../simple-catalogs";

export type SimpleDraft = {
  name: string;
  taxId: string;
  isHours: boolean;
  isTerm: boolean;
};

type Props = {
  kind: SimpleCatalogKind;
  draft: SimpleDraft;
  onChange: (draft: SimpleDraft) => void;
  label: string;
};

export function SimpleCatalogFields({ kind, draft, onChange, label }: Props) {
  const config = SIMPLE_CATALOGS[kind];
  return (
    <>
      <Input
        value={draft.name}
        placeholder="Nombre"
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        aria-label={`Nombre ${label}`}
        className="h-9 min-w-40 flex-1"
      />
      {config.hasTaxId && (
        <Input
          value={draft.taxId}
          placeholder="NIT (opcional)"
          inputMode="numeric"
          onChange={(e) => onChange({ ...draft, taxId: e.target.value })}
          aria-label={`NIT ${label}`}
          className="h-9 w-40"
        />
      )}
      {config.hasHoursFlag && (
        <Label className="flex h-9 items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={draft.isHours}
            onCheckedChange={(checked) =>
              onChange({ ...draft, isHours: checked })
            }
          />
          Es de horas
        </Label>
      )}
      {config.hasHoursFlag && (
        <Label className="flex h-9 items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={draft.isTerm}
            onCheckedChange={(checked) =>
              onChange({ ...draft, isTerm: checked })
            }
          />
          Es de plazo (meses o años)
        </Label>
      )}
    </>
  );
}
