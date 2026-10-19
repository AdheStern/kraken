// src/app/(app)/tickets/page.tsx
// Tablero de tickets visibles para el usuario, por estado, con filtros por cliente, área y «solo míos»
// (AGENTS.md §2.9 "Tickets: ver", §5 navegación "Horas y tickets").
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTicketDialog } from "@/features/tickets/components/new-ticket-dialog";
import { TicketBoard } from "@/features/tickets/components/ticket-board";
import { TicketFilters } from "@/features/tickets/components/ticket-filters";
import { getTicketFormOptions } from "@/features/tickets/queries/get-ticket-form-options";
import { listTickets } from "@/features/tickets/queries/list-tickets";
import { hasRole } from "@/server/authz/roles";
import {
  canCreateAnyTicket,
  canSeeTickets,
} from "@/server/authz/ticket-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tickets" };

export default function TicketsPage({ searchParams }: PageProps<"/tickets">) {
  return (
    <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Tickets"
        description="Soporte y proyectos con su encargado; al cerrarlos se descuentan sus horas de las bolsas."
        actions={
          <Suspense fallback={null}>
            <NewTicketAction />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <TicketsResults searchParams={searchParams} />
      </Suspense>
    </main>
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
  const [customerId, areaCode, mine] = [
    pick("cliente"),
    pick("area"),
    pick("vista") === "mios",
  ];
  // POR QUÉ: se filtra en memoria para que las opciones de los filtros no se encojan al elegir una.
  const visible = tickets.filter(
    (t) =>
      (!customerId || t.customerId === customerId) &&
      (!areaCode || t.areaCodes.includes(areaCode)) &&
      (!mine || t.owner?.id === user.id),
  );
  const customers = [
    ...new Map(tickets.map((t) => [t.customerId, t.customerName])).entries(),
  ]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const areas = [...new Set(tickets.flatMap((t) => t.areaCodes))]
    .sort()
    .map((code) => ({ id: code, label: code }));
  return (
    <>
      {tickets.length > 0 && (
        <TicketFilters
          customers={customers}
          areas={areas}
          canFilterMine={hasRole(user, "INGENIERO")}
        />
      )}
      <TicketBoard
        tickets={visible}
        isFiltered={
          Boolean(customerId || areaCode || mine) && tickets.length > 0
        }
      />
    </>
  );
}
