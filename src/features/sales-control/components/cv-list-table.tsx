// src/features/sales-control/components/cv-list-table.tsx
// Tabla del listado de CV con estado vacío accionable (AGENTS.md §5: los vacíos dicen qué hacer).
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
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
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Código</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
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
              <TableCell className="max-w-72 truncate">{row.title}</TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground">
                {row.customerName}
              </TableCell>
              <TableCell>
                <CvStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(row.totalSaleUsd)}
              </TableCell>
              <TableCell className="text-muted-foreground">
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
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
      <FileSpreadsheet
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="font-medium">
        {isFiltered
          ? "Ningún CV coincide con la búsqueda."
          : "Todavía no tienes CV."}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isFiltered
          ? "Prueba con otro código, cliente o estado."
          : "Crea uno con «Nuevo CV»; el número se asigna según la ciudad y el año."}
      </p>
    </div>
  );
}
