// src/features/sales-control/components/lines/hour-bag-fields.tsx
// Especificación de la bolsa de horas de una línea HORAS + SERVICIO: modalidad, alcance, áreas y vencimiento.
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HourBagSpec } from "../../schemas/cv-lines-schema";
import type { Option } from "../../types";

const FIELD =
  "h-9 w-full rounded-lg border bg-background px-2 text-sm outline-none focus:border-ring disabled:opacity-60";
const EMPTY: HourBagSpec = {
  modality: "H8X5",
  scope: "AREA",
  areaIds: [],
  projectId: null,
  expiresOn: "",
};

type Props = {
  value: HourBagSpec | null;
  areas: Option[];
  disabled: boolean;
  onChange: (value: HourBagSpec) => void;
};

export function HourBagFields({ value, areas, disabled, onChange }: Props) {
  const spec = value ?? EMPTY;
  const update = (patch: Partial<HourBagSpec>) =>
    onChange({ ...spec, ...patch });

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Modalidad
          <select
            className={FIELD}
            value={spec.modality}
            disabled={disabled}
            onChange={(e) =>
              update({ modality: e.target.value as HourBagSpec["modality"] })
            }
          >
            <option value="H8X5">8x5 (fuera de horario vale doble)</option>
            <option value="H24X7">24x7</option>
          </select>
        </Label>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Alcance
          <select
            className={FIELD}
            value={spec.scope}
            disabled={disabled}
            onChange={(e) =>
              update({
                scope: e.target.value as HourBagSpec["scope"],
                areaIds: [],
              })
            }
          >
            <option value="AREA">Por áreas</option>
            <option value="GENERAL">
              General (cualquier ticket del cliente)
            </option>
          </select>
        </Label>
      </div>
      {spec.scope === "AREA" && (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[13px] text-muted-foreground">
            Áreas que consumen esta bolsa
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {areas.map((area) => (
              <Label
                key={area.id}
                className="flex items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={spec.areaIds.includes(area.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    update({
                      areaIds: checked
                        ? [...spec.areaIds, area.id]
                        : spec.areaIds.filter((id) => id !== area.id),
                    })
                  }
                />
                {area.label}
              </Label>
            ))}
          </div>
        </fieldset>
      )}
      <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
        Vence (opcional)
        <Input
          type="date"
          value={spec.expiresOn}
          disabled={disabled}
          onChange={(e) => update({ expiresOn: e.target.value })}
        />
      </Label>
    </div>
  );
}
