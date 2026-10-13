// src/features/sales-control/components/cv-list-filters.tsx
// Búsqueda (código, cliente o título) y filtro por estado del listado; viven en la URL.
"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CvVersionStatus } from "@/generated/prisma/enums";
import { CV_STATUS_LABELS } from "./cv-status-badge";

const ALL = "TODOS";
const SEARCH_DELAY_MS = 300;

export function CvListFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
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
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative sm:w-80">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Código, cliente o título"
          aria-label="Buscar CV"
          className="h-9 pl-8"
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => update("estado", String(value))}
      >
        <SelectTrigger className="h-9 sm:w-48" aria-label="Filtrar por estado">
          <SelectValue>
            {(value: string) =>
              value === ALL
                ? "Todos los estados"
                : CV_STATUS_LABELS[value as CvVersionStatus]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {Object.entries(CV_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
