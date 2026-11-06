// src/features/customers/components/contact-filters-bar.tsx
// Filtros del directorio de contactos en la URL: búsqueda («/» la enfoca), cliente, área, responsable de DIMA y si
// incluye a quienes ya no están (decisión 2026-11-06).
"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CatalogCombobox,
  type CatalogOption,
} from "@/components/forms/catalog-combobox";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DELAY_MS = 300;

type Props = {
  customers: CatalogOption[];
  areas: CatalogOption[];
  users: CatalogOption[];
};

export function ContactFiltersBar({ customers, areas, users }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ "list.filter": () => searchRef.current?.focus() });

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timeout = setTimeout(
      () => update("q", query.trim() || null),
      DELAY_MS,
    );
    return () => clearTimeout(timeout);
  });

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] lg:items-center">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, cargo, correo, teléfono, cliente o municipio"
          aria-label="Buscar contacto"
          className="h-9 pl-8"
        />
      </div>
      <CatalogCombobox
        options={customers}
        value={params.get("cliente")}
        onChange={(v) => update("cliente", v)}
        placeholder="Todos los clientes"
      />
      <CatalogCombobox
        options={areas}
        value={params.get("area")}
        onChange={(v) => update("area", v)}
        placeholder="Todas las áreas"
      />
      <CatalogCombobox
        options={users}
        value={params.get("responsable")}
        onChange={(v) => update("responsable", v)}
        placeholder="Cualquier responsable"
      />
      <Label className="flex items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={params.get("todos") === "1"}
          onCheckedChange={(checked) => update("todos", checked ? "1" : null)}
        />
        Incluir anteriores
      </Label>
    </div>
  );
}
