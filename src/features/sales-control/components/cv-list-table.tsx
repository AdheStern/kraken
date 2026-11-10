// src/features/sales-control/components/cv-list-table.tsx
// Tabla del listado de CV con área y foto de los vendedores, y estado vacío accionable (AGENTS.md §5: los
// vacíos dicen qué hacer).

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
import { formatAmount } from "@/lib/format-amount";
import type { CvListRow } from "../types";
import { CvSellersAvatars } from "./cv-sellers-avatars";
import { CvStatusBadge } from "./cv-status-badge";
import { OpeningBalanceBadge } from "./opening-balance-badge";

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

export function CvListTable({
  rows,
  isFiltered,
}: {
  rows: CvListRow[];
  isFiltered: boolean;
}) {
  if (rows.length === 0) return <EmptyState isFiltered={isFiltered} />;

  return (
    <div data-tour="cv-lista" className="kr-surface overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Código</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="w-24">Área</TableHead>
            <TableHead className="w-24">Vendedor</TableHead>
            <TableHead className="w-32">Estado</TableHead>
            <TableHead className="w-36 text-right">Venta USD</TableHead>
            <TableHead className="w-32">Actualizado</TableHead>
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
              <TableCell className="text-right tabular-nums">
                {formatAmount(row.totalSaleUsd)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateFormat.format(new Date(row.updatedAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
