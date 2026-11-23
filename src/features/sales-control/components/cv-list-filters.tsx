// src/features/sales-control/components/cv-list-filters.tsx
// Búsqueda (código, cliente o título) y filtros por estado, ciudad, área y vendedor del listado; viven en la URL,
// se recuerdan al volver de un CV y cambiarlos vuelve a la página 1.
"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { CV_LIST_FILTER_KEYS, toCvListHref } from "../schemas/cv-list-params";
import type { CvListFilterOptions } from "../types";
import { CV_STATUS_LABELS } from "./cv-status-badge";
import {
  rememberCvListHref,
  useRememberedCvList,
} from "./use-remembered-cv-list";

const SEARCH_DELAY_MS = 300;

const STATUS_OPTIONS = Object.entries(CV_STATUS_LABELS).map(([id, label]) => ({
  id,
  label,
}));

export function CvListFilters({ options }: { options: CvListFilterOptions }) {
  const router = useRouter();
  const params = useSearchParams();
  const urlSearch = params.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const [seenSearch, setSeenSearch] = useState(urlSearch);
  // POR QUÉ: al reponer los filtros guardados la URL trae otra búsqueda; sin copiarla, la espera la borraría.
  if (urlSearch !== seenSearch) {
    setSeenSearch(urlSearch);
    setSearch(urlSearch);
  }
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ "list.filter": () => searchRef.current?.focus() });
  useRememberedCvList();
  const hasFilters = CV_LIST_FILTER_KEYS.some((key) => params.has(key));

  function go(changes: Record<string, string | null>) {
    const href = toCvListHref(params, changes);
    rememberCvListHref(href);
    router.replace(href);
  }

  function update(key: string, value: string | null) {
    go({ [key]: value });
  }

  // TRAMPA: no vaciar la búsqueda aquí; la espera la escribiría sobre la URL vieja. La vacía la URL nueva.
  function clearFilters() {
    go(Object.fromEntries(CV_LIST_FILTER_KEYS.map((key) => [key, null])));
  }

  useEffect(() => {
    if (search === urlSearch) return;
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
      <OptionSelect
        value={params.get("vendedor")}
        options={options.sellers}
        emptyLabel="Todos los vendedores"
        onValueChange={(value) => update("vendedor", value)}
        className="sm:w-52"
        aria-label="Filtrar por vendedor"
      />
      {hasFilters ? (
        <Button variant="ghost" className="h-9" onClick={clearFilters}>
          <X aria-hidden="true" />
          Borrar filtros
        </Button>
      ) : null}
    </div>
  );
}
