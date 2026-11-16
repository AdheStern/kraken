// src/features/sales-control/components/cv-list-filters.tsx
// Búsqueda (código, cliente o título) y filtros por estado, ciudad y área del listado; viven en la URL y
// cambiarlos vuelve a la página 1.
"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { toCvListHref } from "../schemas/cv-list-params";
import type { CvListFilterOptions } from "../types";
import { CV_STATUS_LABELS } from "./cv-status-badge";

const SEARCH_DELAY_MS = 300;

const STATUS_OPTIONS = Object.entries(CV_STATUS_LABELS).map(([id, label]) => ({
  id,
  label,
}));

export function CvListFilters({ options }: { options: CvListFilterOptions }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ "list.filter": () => searchRef.current?.focus() });

  function update(key: string, value: string | null) {
    router.replace(toCvListHref(params, { [key]: value }));
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
    <div
      data-tour="cv-filtros"
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
    >
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
        value={params.get("estado")}
        options={STATUS_OPTIONS}
        emptyLabel="Todos los estados"
        onValueChange={(value) => update("estado", value)}
        className="sm:w-48"
        aria-label="Filtrar por estado"
      />
      <OptionSelect
        value={params.get("ciudad")}
        options={options.cities}
        emptyLabel="Todas las ciudades"
        onValueChange={(value) => update("ciudad", value)}
        className="sm:w-44"
        aria-label="Filtrar por ciudad"
      />
      <OptionSelect
        value={params.get("area")}
        options={options.areas}
        emptyLabel="Todas las áreas"
        onValueChange={(value) => update("area", value)}
        className="sm:w-44"
        aria-label="Filtrar por área"
      />
    </div>
  );
}
