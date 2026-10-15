// src/features/admin/components/audit-filters.tsx
// Filtros del visor de auditoría por la URL: qué se cambió y entre qué fechas; funciona sin JavaScript.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUDIT_ENTITY_LABELS } from "../audit-labels";
import type { AuditFilters as Filters } from "../types";

const ENTITIES = Object.entries(AUDIT_ENTITY_LABELS).sort((a, b) =>
  a[1].localeCompare(b[1], "es"),
);

export function AuditFilters({ filters }: { filters: Filters }) {
  const hasFilters = !!(filters.entity || filters.from || filters.to);
  return (
    <form
      action="/admin/auditoria"
      className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <label className="grid gap-1.5 text-sm font-medium">
        Qué cambió
        <select
          name="entidad"
          defaultValue={filters.entity ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-2 font-normal dark:bg-input/30"
        >
          <option value="">Todo</option>
          {ENTITIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Label className="grid gap-1.5">
        Desde
        <Input
          name="desde"
          type="date"
          defaultValue={filters.from}
          className="h-9"
        />
      </Label>
      <Label className="grid gap-1.5">
        Hasta
        <Input
          name="hasta"
          type="date"
          defaultValue={filters.to}
          className="h-9"
        />
      </Label>
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
