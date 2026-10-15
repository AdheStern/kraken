// src/features/admin/components/audit-filters.tsx
// Filtros del visor de auditoría: qué se cambió y entre qué fechas. Formulario GET: los valores viajan en la URL.
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { AUDIT_ENTITY_LABELS } from "../audit-labels";
import type { AuditFilters as Filters } from "../types";

const ENTITIES = Object.entries(AUDIT_ENTITY_LABELS)
  .map(([id, label]) => ({ id, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

export function AuditFilters({ filters }: { filters: Filters }) {
  const [entity, setEntity] = useState(filters.entity ?? null);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const hasFilters = !!(filters.entity || filters.from || filters.to);
  return (
    <form
      action="/admin/auditoria"
      className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="auditoria-entidad">Qué cambió</Label>
        <OptionSelect
          id="auditoria-entidad"
          name="entidad"
          value={entity}
          options={ENTITIES}
          emptyLabel="Todo"
          onValueChange={setEntity}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="auditoria-desde">Desde</Label>
        <DatePicker
          id="auditoria-desde"
          name="desde"
          value={from}
          onChange={setFrom}
          max={to || undefined}
          clearable
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="auditoria-hasta">Hasta</Label>
        <DatePicker
          id="auditoria-hasta"
          name="hasta"
          value={to}
          onChange={setTo}
          min={from || undefined}
          clearable
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit">Filtrar</Button>
        {hasFilters && (
          <Link
            href="/admin/auditoria"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
