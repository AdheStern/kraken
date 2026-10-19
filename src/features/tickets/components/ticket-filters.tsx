// src/features/tickets/components/ticket-filters.tsx
// Filtros del tablero por cliente, área y «solo míos»; viven en la URL.
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OptionSelect, type SelectOption } from "@/components/ui/option-select";

type Props = {
  customers: SelectOption[];
  areas: SelectOption[];
  canFilterMine: boolean;
};

const MINE_OPTIONS: SelectOption[] = [{ id: "mios", label: "Solo los míos" }];

export function TicketFilters({ customers, areas, canFilterMine }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <OptionSelect
        aria-label="Filtrar por cliente"
        className="h-9 sm:w-72"
        value={params.get("cliente")}
        options={customers}
        emptyLabel="Todos los clientes"
        onValueChange={(v) => update("cliente", v)}
      />
      <OptionSelect
        aria-label="Filtrar por área"
        className="h-9 sm:w-44"
        value={params.get("area")}
        options={areas}
        emptyLabel="Todas las áreas"
        onValueChange={(v) => update("area", v)}
      />
      {canFilterMine && (
        <OptionSelect
          aria-label="Filtrar por encargado"
          className="h-9 sm:w-44"
          value={params.get("vista")}
          options={MINE_OPTIONS}
          emptyLabel="Todos los tickets"
          onValueChange={(v) => update("vista", v)}
        />
      )}
    </div>
  );
}
