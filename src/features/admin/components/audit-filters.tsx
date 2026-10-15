// src/features/admin/components/audit-filters.tsx
// Filtros del visor de auditoría por la URL: qué se cambió y entre qué fechas; funciona sin JavaScript.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditFilters as Filters } from "../types";
import { AuditEntitySelect } from "./audit-entity-select";

export function AuditFilters({ filters }: { filters: Filters }) {
  const hasFilters = !!(filters.entity || filters.from || filters.to);
  return (
    <form
      action="/admin/auditoria"
      className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="auditoria-entidad">Qué cambió</Label>
        <AuditEntitySelect
          id="auditoria-entidad"
          defaultValue={filters.entity ?? null}
        />
      </div>
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
