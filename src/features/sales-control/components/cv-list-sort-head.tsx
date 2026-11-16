// src/features/sales-control/components/cv-list-sort-head.tsx
// Encabezado de columna ordenable del listado de CV: un enlace que alterna el orden y anuncia el actual
// con aria-sort, para teclado y lectores de pantalla.
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import { TableHead } from "@/components/ui/table";
import type {
  CvSort,
  CvSortKey,
  SortDirection,
} from "@/domain/sales-control/cv-list-order";
import { cn } from "@/lib/utils";
import { toCvListHref } from "../schemas/cv-list-params";

// POR QUÉ: montos, fechas y números empiezan por lo mayor o más reciente; los textos, de la A a la Z.
const FIRST_DIRECTION: Record<CvSortKey, SortDirection> = {
  codigo: "desc",
  titulo: "asc",
  cliente: "asc",
  estado: "asc",
  venta: "desc",
  actualizado: "desc",
};

const DIRECTION_LABEL: Record<SortDirection, string> = {
  asc: "ascendente",
  desc: "descendente",
};

type Props = {
  column: CvSortKey;
  label: string;
  sort: CvSort;
  query: string;
  className?: string;
  alignEnd?: boolean;
};

export function CvListSortHead({
  column,
  label,
  sort,
  query,
  className,
  alignEnd,
}: Props) {
  const isActive = sort.key === column;
  const next: SortDirection = isActive
    ? sort.direction === "asc"
      ? "desc"
      : "asc"
    : FIRST_DIRECTION[column];
  const Icon = !isActive
    ? ChevronsUpDownIcon
    : sort.direction === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;
  const href = toCvListHref(new URLSearchParams(query), {
    orden: column,
    dir: next,
  });

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
        href={href}
        scroll={false}
        className={cn(
          "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          alignEnd && "flex-row-reverse",
          !isActive && "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">{`, ordenar ${DIRECTION_LABEL[next]}`}</span>
      </Link>
    </TableHead>
  );
}
