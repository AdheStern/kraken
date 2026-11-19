// src/features/tickets/components/ticket-list-table.tsx
// Vista de lista de tickets: tabla ordenable con número, título, cliente, áreas, prioridad, estado, encargado,
// SLA y última actualización, y su paginación (AGENTS.md §5). La usan /tickets y el detalle de un proyecto.
import Link from "next/link";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SlaBadge } from "@/features/sla/components/sla-badge";
import type { TicketListPage } from "../queries/list-tickets-page";
import type { TicketSort } from "../schemas/ticket-list-params";
import {
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../ticket-labels";
import { TicketListPagination } from "./ticket-list-pagination";
import { TicketListSortHead } from "./ticket-list-sort-head";

type Props = {
  page: TicketListPage;
  sort: TicketSort;
  basePath: string;
  query: string;
  isFiltered: boolean;
};

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/La_Paz",
});

export function TicketListTable({
  page,
  sort,
  basePath,
  query,
  isFiltered,
}: Props) {
  const { rows, ...facts } = page;
  if (rows.length === 0)
    return (
      <KrakenEmpty
        mood={isFiltered ? "curious" : "idle"}
        title={
          isFiltered
            ? "Ningún ticket con estos filtros"
            : "No hay tickets todavía"
        }
      >
        {isFiltered
          ? "Quita un filtro o cambia el estado para ver más tickets."
          : "Créalo con «Nuevo ticket» y asígnale un encargado."}
      </KrakenEmpty>
    );
  const head = { sort, basePath, query };
  return (
    <div className="flex flex-col gap-3">
      <div className="kr-surface overflow-x-auto rounded-xl">
        <Table>
          <caption className="sr-only">
            Tickets. Los encabezados con flecha ordenan la tabla.
          </caption>
          <TableHeader>
            <TableRow>
              <TicketListSortHead
                column="numero"
                label="#"
                className="w-20"
                {...head}
              />
              <TicketListSortHead column="titulo" label="Título" {...head} />
              <TicketListSortHead column="cliente" label="Cliente" {...head} />
              <TableHead className="w-28">Áreas</TableHead>
              <TicketListSortHead
                column="prioridad"
                label="Prioridad"
                className="w-28"
                {...head}
              />
              <TicketListSortHead
                column="estado"
                label="Estado"
                className="w-36"
                {...head}
              />
              <TableHead className="w-44">Encargado</TableHead>
              <TableHead className="w-40">SLA</TableHead>
              <TicketListSortHead
                column="actualizado"
                label="Actualizado"
                className="w-32"
                {...head}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} className="relative">
                <TableCell className="font-medium tabular-nums">
                  <Link
                    href={`/tickets/${t.id}`}
                    className="after:absolute after:inset-0 hover:underline"
                  >
                    #{t.number}
                  </Link>
                </TableCell>
                <TableCell className="max-w-72 truncate">{t.title}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {t.customerName}
                </TableCell>
                <TableCell className="max-w-28 truncate text-muted-foreground">
                  {t.areaCodes.join(" / ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={PRIORITY_CLASSES[t.priority]}
                  >
                    {PRIORITY_LABELS[t.priority]}
                  </Badge>
                </TableCell>
                <TableCell>{STATUS_LABELS[t.status]}</TableCell>
                <TableCell className="max-w-44">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {t.owner && (
                      <PersonAvatar
                        name={t.owner.name}
                        image={t.owner.image}
                        className="size-5 text-[10px]"
                      />
                    )}
                    <span
                      className={
                        t.owner ? "truncate" : "truncate text-muted-foreground"
                      }
                    >
                      {t.owner?.name ?? "Sin encargado"}
                    </span>
                  </span>
                </TableCell>
                <TableCell>{t.sla ? <SlaBadge sla={t.sla} /> : "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateFormat.format(new Date(t.updatedAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TicketListPagination page={facts} />
    </div>
  );
}
