// src/features/hours/components/bag-filters.tsx
// Filtros del seguimiento de bolsas por cliente y estado; viven en la URL.
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BagStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "./bag-labels";

const ALL = "TODOS";

type Props = { customers: { id: string; name: string }[] };

export function BagFilters({ customers }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const customer = params.get("cliente") ?? ALL;
  const status = params.get("estado") ?? ALL;
  const customerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "Cliente";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select
        value={customer}
        onValueChange={(v) => update("cliente", String(v))}
      >
        <SelectTrigger className="h-9 sm:w-72" aria-label="Filtrar por cliente">
          <SelectValue>
            {(value: string) =>
              value === ALL ? "Todos los clientes" : customerName(value)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los clientes</SelectItem>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => update("estado", String(v))}>
        <SelectTrigger className="h-9 sm:w-44" aria-label="Filtrar por estado">
          <SelectValue>
            {(value: string) =>
              value === ALL
                ? "Todos los estados"
                : STATUS_LABELS[value as BagStatus]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
