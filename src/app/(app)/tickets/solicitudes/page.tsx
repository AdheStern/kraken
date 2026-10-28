// src/app/(app)/tickets/solicitudes/page.tsx
// Solicitudes de ticket pendientes de las áreas que el usuario atiende: crear el ticket o descartar (AGENTS.md §2.6
// «Solicitudes de ticket»).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketRequestInbox } from "@/features/tickets/components/ticket-request-inbox";
import { getTicketFormOptions } from "@/features/tickets/queries/get-ticket-form-options";
import { listPendingTicketRequests } from "@/features/tickets/queries/list-pending-ticket-requests";
import { canHandleAnyTicketRequest } from "@/server/authz/ticket-request-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Solicitudes de ticket" };

export default function PendingTicketRequestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/tickets"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tickets
      </Link>
      <ModuleHeading
        title="Solicitudes de ticket"
        description="Lo que piden las personas de DIMA a tus áreas, las más antiguas primero. Crea el ticket con sus datos o descártala con un motivo."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Inbox />
      </Suspense>
    </main>
  );
}

async function Inbox() {
  const user = await requireUser();
  if (!canHandleAnyTicketRequest(user)) notFound();
  const [requests, options] = await Promise.all([
    listPendingTicketRequests(user),
    getTicketFormOptions(user),
  ]);
  return <TicketRequestInbox requests={requests} options={options} />;
}
