// src/features/tickets/components/ticket-list-sort-head.tsx
// Encabezado ordenable de la vista de lista de tickets: un enlace que alterna el orden y lo anuncia con
// aria-sort, para teclado y lectores de pantalla.
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type TicketSort,
  type TicketSortKey,
  toTicketListHref,
} from "../schemas/ticket-list-params";

// POR QUÉ: números y fechas empiezan por lo más reciente y la prioridad por la crítica; los textos, de la A a la Z.
const FIRST_DIRECTION: Record<TicketSortKey, "asc" | "desc"> = {
  numero: "desc",
  titulo: "asc",
  cliente: "asc",
  prioridad: "desc",
  estado: "asc",
  actualizado: "desc",
};

type Props = {
  column: TicketSortKey;
  label: string;
  sort: TicketSort;
  basePath: string;
  query: string;
  className?: string;
};

export function TicketListSortHead({
  column,
  label,
  sort,
  basePath,
  query,
  className,
}: Props) {
  const isActive = sort.key === column;
  const next = isActive
    ? sort.direction === "asc"
      ? "desc"
      : "asc"
    : FIRST_DIRECTION[column];
  const Icon = !isActive
    ? ChevronsUpDownIcon
    : sort.direction === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;
  return (
    <TableHead
      className={className}
      aria-sort={
        isActive
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <Link
        href={toTicketListHref(basePath, new URLSearchParams(query), {
          orden: column,
          dir: next,
        })}
        scroll={false}
        className={cn(
          "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          !isActive && "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">
          {`, ordenar ${next === "asc" ? "ascendente" : "descendente"}`}
        </span>
      </Link>
    </TableHead>
  );
}
