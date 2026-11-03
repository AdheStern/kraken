// src/features/admin/components/portal-access-fields.tsx
// Qué permite el portal a la cuenta de un cliente: ver bolsas, pedir trabajo, comentar y adjuntar (§2.11).
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type PortalAccess = {
  seesBags: boolean;
  requestsWork: boolean;
  comments: boolean;
};

const OPTIONS: { key: keyof PortalAccess; label: string }[] = [
  {
    key: "seesBags",
    label: "Ve sus bolsas de horas (saldo, consumo y vencimiento)",
  },
  {
    key: "requestsWork",
    label: "Pide trabajo (una solicitud que DIMA convierte en ticket)",
  },
  { key: "comments", label: "Comenta y adjunta archivos en sus tickets" },
];

export function PortalAccessFields({
  value,
  onChange,
}: {
  value: PortalAccess;
  onChange: (value: PortalAccess) => void;
}) {
  return (
    <fieldset className="grid gap-2 sm:col-span-2">
      <legend className="mb-1 text-sm font-medium">
        Qué puede hacer · siempre ve sus tickets y las horas descontadas
      </legend>
      {OPTIONS.map((option) => (
        <Label key={option.key} className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={value[option.key]}
            onCheckedChange={(checked) =>
              onChange({ ...value, [option.key]: checked === true })
            }
          />
          {option.label}
        </Label>
      ))}
    </fieldset>
  );
}
