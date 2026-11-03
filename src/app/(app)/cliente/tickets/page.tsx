// src/app/(app)/cliente/tickets/page.tsx
// Tickets de la empresa en el portal de clientes (AGENTS.md §2.11). Solo para la cuenta de un cliente.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerTicketList } from "@/features/tickets/components/customer-ticket-list";
import { listCustomerTickets } from "@/features/tickets/queries/list-customer-tickets";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tickets" };

export default function CustomerTicketsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Tickets"
        description="Lo que DIMA atiende para tu empresa: los abiertos primero; al cerrarse, las horas descontadas de tu contrato."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Tickets />
      </Suspense>
    </main>
  );
}

async function Tickets() {
  const user = await requireUser();
  if (!user.customer) notFound();
  return <CustomerTicketList tickets={await listCustomerTickets(user)} />;
}
