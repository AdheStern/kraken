// src/features/sales-control/components/cv-list-table.tsx
// Tabla del listado de CV con columnas ordenables, área, foto de los vendedores, costo total (solo si se ven
// costos) y paginación, y estado vacío accionable (AGENTS.md §5: los vacíos dicen qué hacer).

import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CvSort } from "@/domain/sales-control/cv-list-order";
import { formatAmount } from "@/lib/format-amount";
import type { CvListPage } from "../types";
import { CvListPagination } from "./cv-list-pagination";
import { CvListSortHead } from "./cv-list-sort-head";
import { CvSellersAvatars } from "./cv-sellers-avatars";
import { CvStatusBadge } from "./cv-status-badge";
import { FinalPriceMark } from "./final-price-mark";
import { OpeningBalanceBadge } from "./opening-balance-badge";

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

type Props = {
  page: CvListPage;
  sort: CvSort;
  // Parámetros actuales de la URL: los enlaces de orden y página los conservan.
  query: string;
  isFiltered: boolean;
};

export function CvListTable({ page, sort, query, isFiltered }: Props) {
  const { rows } = page;
  if (rows.length === 0) return <EmptyState isFiltered={isFiltered} />;
  const head = { sort, query };
  // POR QUÉ: quien no ve costos de ningún CV del listado no recibe una columna vacía.
  const showsCost = rows.some((row) => row.totalCostUsd !== null);

  return (
    <div className="flex flex-col gap-3">
      <div
        data-tour="cv-lista"
        className="kr-surface overflow-x-auto rounded-xl"
      >
        <Table>
          <caption className="sr-only">
            Controles de Venta. Los encabezados con flecha ordenan la tabla.
          </caption>
          <TableHeader>
            <TableRow>
              <CvListSortHead
                column="codigo"
                label="Código"
                className="w-28"
                {...head}
              />
              <CvListSortHead column="titulo" label="Título" {...head} />
              <CvListSortHead column="cliente" label="Cliente" {...head} />
              <TableHead className="w-24">Área</TableHead>
              <TableHead className="w-24">Vendedor</TableHead>
              <CvListSortHead
                column="estado"
                label="Estado"
                className="w-32"
                {...head}
              />
              {/* REGLA: el costo no se ordena: el orden revelaría costos que el usuario no ve (regla 12). */}
              {showsCost && (
                <TableHead className="w-36 text-right">Costo USD</TableHead>
              )}
              <CvListSortHead
                column="venta"
                label="Venta USD"
                className="w-36 text-right"
                alignEnd
                {...head}
              />
              <CvListSortHead
                column="actualizado"
                label="Actualizado"
                className="w-32"
                {...head}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="relative">
                <TableCell className="font-medium tabular-nums">
                  <Link
                    href={`/cv/${row.id}`}
                    className="after:absolute after:inset-0 hover:underline"
                  >
                    {row.versionLabel}
                  </Link>
                  {row.isOpeningBalance && (
                    <span className="ml-2 align-middle">
                      <OpeningBalanceBadge />
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-64 truncate">{row.title}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {row.customerName}
                </TableCell>
                <TableCell className="max-w-32 truncate text-muted-foreground">
                  {row.areas.join(" / ") || "—"}
                </TableCell>
                {/* POR QUÉ: por encima del enlace que cubre la fila, para que el tooltip del nombre se vea. */}
                <TableCell className="relative z-10 w-fit">
                  <CvSellersAvatars sellers={row.sellers} />
                </TableCell>
                <TableCell>
                  <CvStatusBadge status={row.status} />
                </TableCell>
                {showsCost && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.totalCostUsd === null
                      ? "—"
                      : formatAmount(row.totalCostUsd)}
                  </TableCell>
                )}
                <TableCell className="text-right tabular-nums">
                  {formatAmount(row.totalSaleUsd)}
                  {row.hasFinalPrice && <FinalPriceMark />}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateFormat.format(new Date(row.updatedAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CvListPagination page={page} query={query} />
    </div>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <KrakenEmpty
      mood={isFiltered ? "curious" : "idle"}
      title={
        isFiltered
          ? "Ningún CV coincide con la búsqueda."
          : "Todavía no tienes CV."
      }
    >
      {isFiltered
        ? "Prueba con otro código, cliente o estado."
        : "Crea uno con «Nuevo CV»; el número se asigna según la ciudad y el año."}
    </KrakenEmpty>
  );
}
