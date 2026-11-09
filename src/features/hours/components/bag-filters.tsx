// src/features/hours/components/bag-filters.tsx
// Filtros del seguimiento de bolsas por cliente y estado; viven en la URL.
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OptionSelect } from "@/components/ui/option-select";
import { STATUS_LABELS } from "./bag-labels";

const ALL = "TODOS";

type Props = { customers: { id: string; name: string }[] };

export function BagFilters({ customers }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const customer = params.get("cliente") ?? ALL;
  const status = params.get("estado") ?? ALL;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div data-tour="bolsas-filtros" className="flex flex-col gap-2 sm:flex-row">
      <OptionSelect
        value={customer === ALL ? null : customer}
        options={customers.map((c) => ({ id: c.id, label: c.name }))}
        emptyLabel="Todos los clientes"
        onValueChange={(v) => update("cliente", v ?? ALL)}
        className="sm:w-72"
        aria-label="Filtrar por cliente"
      />
      <OptionSelect
        value={status === ALL ? null : status}
        options={Object.entries(STATUS_LABELS).map(([id, label]) => ({
          id,
          label,
        }))}
        emptyLabel="Todos los estados"
        onValueChange={(v) => update("estado", v ?? ALL)}
        className="sm:w-44"
        aria-label="Filtrar por estado"
      />
    </div>
  );
}
