// src/features/sales-control/components/cv-list-filters.tsx
// Búsqueda (código, cliente o título) y filtro por estado del listado; viven en la URL.
"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { CV_STATUS_LABELS } from "./cv-status-badge";

const ALL = "TODOS";
const SEARCH_DELAY_MS = 300;

export function CvListFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ "list.filter": () => searchRef.current?.focus() });
  const status = params.get("estado") ?? ALL;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (search === (params.get("q") ?? "")) return;
    const timeout = setTimeout(
      () => update("q", search.trim()),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  });

  return (
    <div data-tour="cv-filtros" className="flex flex-col gap-2 sm:flex-row">
      <div className="relative sm:w-80">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Código, cliente o título"
          aria-label="Buscar CV"
          className="h-9 pl-8"
        />
      </div>
      <OptionSelect
        value={status === ALL ? null : status}
        options={Object.entries(CV_STATUS_LABELS).map(([id, label]) => ({
          id,
          label,
        }))}
        emptyLabel="Todos los estados"
        onValueChange={(value) => update("estado", value ?? ALL)}
        className="sm:w-48"
        aria-label="Filtrar por estado"
      />
    </div>
  );
}
