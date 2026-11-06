// src/app/(app)/cliente/page.tsx
// Inicio del portal de clientes: tickets abiertos, cerrados en el mes, horas descontadas y los más recientes
// (AGENTS.md §2.11). Solo para la cuenta de una empresa cliente.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeCustomerTickets } from "@/domain/tickets/summarize-customer-tickets";
import { PageTour } from "@/features/help/components/page-tour";
import { CustomerTicketList } from "@/features/tickets/components/customer-ticket-list";
import { listCustomerTickets } from "@/features/tickets/queries/list-customer-tickets";
import { formatMinutes } from "@/lib/format-minutes";
import { systemClock } from "@/server/clock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Inicio" };

export default function CustomerHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const user = await requireUser();
  if (!user.customer) notFound();
  const tickets = await listCustomerTickets(user);
  const summary = summarizeCustomerTickets(
    tickets.map((t) => ({
      ...t,
      closedAt: t.closedAt ? new Date(t.closedAt) : null,
    })),
    systemClock.now(),
  );
  const cards: [string, string][] = [
    ["Tickets abiertos", String(summary.openCount)],
    ["Cerrados este mes", String(summary.closedThisMonth)],
    [
      "Horas descontadas este mes",
      formatMinutes(summary.chargedMinutesThisMonth),
    ],
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Hola, {user.name}
        </h1>
        <PageTour id="cliente" />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="kr-surface rounded-xl p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Tickets recientes</h2>
        <Link
          href="/cliente/tickets"
          className="text-sm text-primary hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <CustomerTicketList tickets={tickets.slice(0, 5)} />
    </>
  );
}
