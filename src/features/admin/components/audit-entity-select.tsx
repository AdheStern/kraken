// src/features/admin/components/audit-entity-select.tsx
// "Qué cambió" en los filtros de auditoría: el valor viaja en el formulario GET como "entidad".
"use client";

import { useState } from "react";
import { OptionSelect } from "@/components/ui/option-select";
import { AUDIT_ENTITY_LABELS } from "../audit-labels";

const ENTITIES = Object.entries(AUDIT_ENTITY_LABELS)
  .map(([id, label]) => ({ id, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

type Props = { id: string; defaultValue: string | null };

export function AuditEntitySelect({ id, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue);
  return (
    <OptionSelect
      id={id}
      name="entidad"
      value={value}
      options={ENTITIES}
      emptyLabel="Todo"
      onValueChange={setValue}
    />
  );
}
