// src/features/admin/components/sibling-positions-field.tsx
// Otros puestos activos de un contacto compartido, con una casilla por empresa: al editar, dónde aplicar también su
// correo y teléfono; al transferir, qué otros puestos deja (decisión 2026-11-16).
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ContactSibling } from "../types";

type Props = {
  legend: string;
  hint: string;
  siblings: ContactSibling[];
  value: string[];
  onChange: (contactIds: string[]) => void;
};

export function SiblingPositionsField({
  legend,
  hint,
  siblings,
  value,
  onChange,
}: Props) {
  if (siblings.length === 0) return null;
  return (
    <fieldset className="grid gap-1.5 rounded-lg border p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-medium">{legend}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
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
