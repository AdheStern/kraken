// src/app/(app)/solicitudes/page.tsx
// Mis solicitudes: cualquier usuario con rol pide un ticket a un área y sigue su estado (AGENTS.md §2.6
// «Solicitudes de ticket»).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { MyTicketRequests } from "@/features/tickets/components/my-ticket-requests";
import { TicketRequestDialog } from "@/features/tickets/components/ticket-request-dialog";
import { listMyTicketRequests } from "@/features/tickets/queries/list-my-ticket-requests";
import { listRequestAreas } from "@/features/tickets/queries/list-request-areas";
import { canRequestTicket } from "@/server/authz/ticket-request-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Mis solicitudes" };

export default function TicketRequestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Mis solicitudes"
        description="Pide un ticket a un área y sigue su estado: te avisamos cuando lo atiendan y cuando se resuelva."
        actions={
          <Suspense fallback={null}>
            <NewRequestAction />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Requests />
      </Suspense>
    </main>
  );
}

async function NewRequestAction() {
  const user = await requireUser();
  if (!canRequestTicket(user)) return null;
  return <TicketRequestDialog areas={await listRequestAreas()} />;
}

async function Requests() {
  const user = await requireUser();
  if (!canRequestTicket(user)) notFound();
  return <MyTicketRequests requests={await listMyTicketRequests(user)} />;
}
