// src/features/dashboards/components/dashboard-filter-bar.tsx
// Una sola fila de filtros sobre todo el tablero: periodo primero, luego área y ciudad. Viven en la URL, así un
// corte se comparte con un enlace (AGENTS.md §6).
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodKind } from "@/domain/dashboards/period";
import type { FilterOption } from "../queries/get-filter-options";
import type { PeriodOption } from "../schemas/dashboard-filters";

const ALL = "TODAS";

const KINDS: FilterOption[] = [
  { id: "MES", label: "Mes" },
  { id: "TRIMESTRE", label: "Trimestre" },
  { id: "ANIO", label: "Año" },
];

type Props = {
  periods: Record<PeriodKind, PeriodOption[]>;
  kind: PeriodKind;
  period: string;
  areas: FilterOption[];
  cities: FilterOption[];
  showCity?: boolean;
};

export function DashboardFilterBar({
  periods,
  kind,
  period,
  areas,
  cities,
  showCity = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      data-pending={isPending || undefined}
    >
      <FilterSelect
        label="Tipo de periodo"
        value={kind}
        options={KINDS}
        onChange={(v) =>
          update("periodo", periods[v as PeriodKind]?.[0]?.token ?? "")
        }
        className="sm:w-36"
      />
      <FilterSelect
        label="Periodo"
        value={period}
        options={periods[kind].map((p) => ({ id: p.token, label: p.label }))}
        onChange={(v) => update("periodo", v)}
        className="sm:w-44"
      />
      {areas.length > 0 && (
        <FilterSelect
          label="Área"
          value={params.get("area") ?? ALL}
          options={[{ id: ALL, label: "Todas las áreas" }, ...areas]}
          onChange={(v) => update("area", v)}
          className="sm:w-44"
        />
      )}
      {showCity && cities.length > 1 && (
        <FilterSelect
          label="Ciudad"
          value={params.get("ciudad") ?? ALL}
          options={[{ id: ALL, label: "Todas las ciudades" }, ...cities]}
          onChange={(v) => update("ciudad", v)}
          className="sm:w-44"
        />
      )}
    </div>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className: string;
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: SelectProps) {
  const labelOf = (id: string) =>
    options.find((o) => o.id === id)?.label ?? label;
  return (
    <Select value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger
        className={`h-9 ${className}`}
        aria-label={`Filtrar por ${label.toLowerCase()}`}
      >
        <SelectValue>{(v: string) => labelOf(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
