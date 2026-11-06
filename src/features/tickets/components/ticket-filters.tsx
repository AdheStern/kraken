// src/features/tickets/components/ticket-filters.tsx
// Filtros del tablero por número o título («/» lleva al buscador), cliente, área y «solo míos»; viven en la URL.
"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Input } from "@/components/ui/input";
import { OptionSelect, type SelectOption } from "@/components/ui/option-select";

type Props = {
  customers: SelectOption[];
  areas: SelectOption[];
  canFilterMine: boolean;
};

const MINE_OPTIONS: SelectOption[] = [{ id: "mios", label: "Solo los míos" }];
const SEARCH_DELAY_MS = 300;

export function TicketFilters({ customers, areas, canFilterMine }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ "list.filter": () => searchRef.current?.focus() });

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (search === (params.get("q") ?? "")) return;
    const timeout = setTimeout(
      () => update("q", search.trim() || null),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  });

  return (
    <div data-tour="ticket-filtros" className="flex flex-col gap-2 sm:flex-row">
      <div className="relative sm:w-64">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Número o título"
          aria-label="Buscar ticket"
          className="h-9 pl-8"
        />
      </div>
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
