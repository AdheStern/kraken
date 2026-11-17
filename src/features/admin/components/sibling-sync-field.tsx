// src/features/admin/components/sibling-sync-field.tsx
// Al editar un contacto compartido: en qué otras empresas se aplica también su correo y teléfono. Cada una viene
// marcada si hoy tiene los mismos datos (decisión 2026-11-16).
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ContactSibling } from "../types";

type Props = {
  siblings: ContactSibling[];
  value: string[];
  onChange: (contactIds: string[]) => void;
};

export function SiblingSyncField({ siblings, value, onChange }: Props) {
  if (siblings.length === 0) return null;
  return (
    <fieldset className="grid gap-1.5 rounded-lg border p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-medium">
        También es contacto de otras empresas
      </legend>
      <p className="text-xs text-muted-foreground">
        Aplica el correo y el teléfono también en las marcadas. El nombre se
        actualiza en todas.
      </p>
      {siblings.map((s) => (
        <Label
          key={s.contactId}
          className="flex items-center gap-2 font-normal"
        >
          <Checkbox
            checked={value.includes(s.contactId)}
            onCheckedChange={(checked) =>
              onChange(
                checked === true
                  ? [...value, s.contactId]
                  : value.filter((id) => id !== s.contactId),
              )
            }
          />
          {s.customerName}
          <span className="truncate text-xs text-muted-foreground">
            {[s.email, s.phone].filter(Boolean).join(" · ")}
          </span>
        </Label>
      ))}
    </fieldset>
  );
}
