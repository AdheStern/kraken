// src/features/sales-control/components/lines/hour-bag-fields.tsx
// Especificación de la bolsa de horas de una línea HORAS + SERVICIO: modalidad, alcance (áreas, proyecto del
// cliente o general) y vencimiento.
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import type { HourBagSpec } from "../../schemas/cv-lines-schema";
import type { Option } from "../../types";

const MODALITY_OPTIONS = [
  { id: "H8X5", label: "8x5 (fuera de horario vale doble)" },
  { id: "H24X7", label: "24x7" },
];
const SCOPE_OPTIONS = [
  { id: "AREA", label: "Por áreas" },
  { id: "PROYECTO", label: "Un proyecto del cliente" },
  { id: "GENERAL", label: "General (cualquier ticket del cliente)" },
];
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
  projects: Option[];
  disabled: boolean;
  onChange: (value: HourBagSpec) => void;
};

export function HourBagFields({
  value,
  areas,
  projects,
  disabled,
  onChange,
}: Props) {
  const spec = value ?? EMPTY;
  const update = (patch: Partial<HourBagSpec>) =>
    onChange({ ...spec, ...patch });

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Modalidad
          <OptionSelect
            aria-label="Modalidad"
            value={spec.modality}
            disabled={disabled}
            options={MODALITY_OPTIONS}
            onValueChange={(modality) =>
              modality &&
              update({ modality: modality as HourBagSpec["modality"] })
            }
          />
        </Label>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Alcance
          <OptionSelect
            aria-label="Alcance"
            value={spec.scope}
            disabled={disabled}
            options={SCOPE_OPTIONS}
            onValueChange={(scope) =>
              scope &&
              update({
                scope: scope as HourBagSpec["scope"],
                areaIds: [],
                projectId: null,
              })
            }
          />
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
      {spec.scope === "PROYECTO" && (
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Proyecto
          <OptionSelect
            aria-label="Proyecto"
            value={spec.projectId}
            disabled={disabled || projects.length === 0}
            options={projects}
            placeholder={
              projects.length === 0
                ? "El cliente no tiene proyectos activos"
                : "Elige el proyecto"
            }
            onValueChange={(projectId) => update({ projectId })}
          />
        </Label>
      )}
      <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
        Vence (opcional)
        <DatePicker
          value={spec.expiresOn}
          disabled={disabled}
          clearable
          placeholder="Sin vencimiento"
          aria-label="Vence"
          onChange={(expiresOn) => update({ expiresOn })}
        />
      </Label>
    </div>
  );
}
