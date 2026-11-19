// src/app/(app)/tickets/page.tsx
// Tickets visibles para el usuario en tablero por estado o en lista paginada y ordenable, con filtros por
// cliente, área, «solo míos» y, en la lista, estado (AGENTS.md §2.9 "Tickets: ver", §5 navegación).
import { FolderKanban, History, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTicketDialog } from "@/features/tickets/components/new-ticket-dialog";
import { TicketBoard } from "@/features/tickets/components/ticket-board";
import { TicketFilters } from "@/features/tickets/components/ticket-filters";
import { TicketListTable } from "@/features/tickets/components/ticket-list-table";
import { TicketViewToggle } from "@/features/tickets/components/ticket-view-toggle";
import { countPendingTicketRequests } from "@/features/tickets/queries/count-pending-ticket-requests";
import { getTicketFormOptions } from "@/features/tickets/queries/get-ticket-form-options";
import { listTickets } from "@/features/tickets/queries/list-tickets";
import { listTicketsPage } from "@/features/tickets/queries/list-tickets-page";
import { parseTicketListParams } from "@/features/tickets/schemas/ticket-list-params";
import { toQueryString } from "@/lib/to-query-string";
import { hasRole } from "@/server/authz/roles";
import {
  canCreateAnyTicket,
  canSeeTickets,
} from "@/server/authz/ticket-permissions";
import { canHandleAnyTicketRequest } from "@/server/authz/ticket-request-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tickets" };

export default function TicketsPage({ searchParams }: PageProps<"/tickets">) {
  return (
    <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Tickets"
        tour="tickets"
        description="Soporte y proyectos con su encargado; al cerrarlos se descuentan sus horas de las bolsas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={null}>
              <RequestsLink />
            </Suspense>
            <Link
              href="/tickets/proyectos"
              className={buttonVariants({ variant: "outline" })}
            >
              <FolderKanban aria-hidden="true" />
              Proyectos
            </Link>
            <Suspense fallback={null}>
              <HistoricalLoadLink />
            </Suspense>
            <Suspense fallback={null}>
              <NewTicketAction />
            </Suspense>
          </div>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <TicketsResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RequestsLink() {
  const user = await requireUser();
  if (!canHandleAnyTicketRequest(user)) return null;
  const pending = await countPendingTicketRequests(user);
  return (
    <Link
      href="/tickets/solicitudes"
      className={buttonVariants({
        variant: pending > 0 ? "default" : "outline",
      })}
    >
      <Inbox aria-hidden="true" />
      Solicitudes
      {pending > 0 && (
        <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs tabular-nums">
          {pending}
        </span>
      )}
    </Link>
  );
}

async function HistoricalLoadLink() {
  const user = await requireUser();
  if (!canCreateAnyTicket(user)) return null;
  return (
    <Link
      href="/tickets/carga-historica"
      className={buttonVariants({ variant: "outline" })}
    >
      <History aria-hidden="true" />
      Carga histórica
    </Link>
  );
}

async function NewTicketAction() {
  const user = await requireUser();
  if (!canCreateAnyTicket(user)) return null;
  return <NewTicketDialog options={await getTicketFormOptions(user)} />;
}

async function TicketsResults({
  searchParams,
}: Pick<PageProps<"/tickets">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeTickets(user)) notFound();
  const [params, tickets] = await Promise.all([
    searchParams,
    listTickets(user),
  ]);
  const pick = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : null;
  const projectId = pick("proyecto");
  // POR QUÉ: los tickets de un proyecto viven en su detalle; el enlace viejo del tablero filtrado lleva ahí.
  if (projectId) redirect(`/tickets/proyectos/${projectId}`);
  const [customerId, areaCode, mine] = [
    pick("cliente"),
    pick("area"),
    pick("vista") === "mios",
  ];
  const text = (pick("q") ?? "").replace(/^#/, "").toLowerCase();
  // POR QUÉ: se filtra en memoria para que las opciones de los filtros no se encojan al elegir una.
  const visible = tickets.filter(
    (t) =>
      (!customerId || t.customerId === customerId) &&
      (!areaCode || t.areaCodes.includes(areaCode)) &&
      (!mine || t.owner?.id === user.id) &&
      (!text ||
        String(t.number).startsWith(text) ||
        t.title.toLowerCase().includes(text)),
  );
  const customers = [
    ...new Map(tickets.map((t) => [t.customerId, t.customerName])).entries(),
  ]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const areas = [...new Set(tickets.flatMap((t) => t.areaCodes))]
    .sort()
    .map((code) => ({ id: code, label: code }));
  const list = parseTicketListParams(params);
  const query = toQueryString(params);
  return (
    <>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {tickets.length > 0 || list.mode === "lista" ? (
          <TicketFilters
            customers={customers}
            areas={areas}
            canFilterMine={hasRole(user, "INGENIERO")}
            canFilterStatus={list.mode === "lista"}
          />
        ) : (
          <span />
        )}
        <TicketViewToggle mode={list.mode} basePath="/tickets" query={query} />
      </div>
      {list.mode === "lista" ? (
        <TicketListTable
          page={await listTicketsPage(user, list)}
          sort={list.sort}
          basePath="/tickets"
          query={query}
          isFiltered={Boolean(
            customerId || areaCode || mine || text || list.status,
          )}
        />
      ) : (
        <TicketBoard
          tickets={visible}
          isFiltered={
            Boolean(customerId || areaCode || mine) && tickets.length > 0
          }
        />
      )}
    </>
  );
}
