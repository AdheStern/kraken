// src/app/(app)/tickets/[id]/page.tsx
// Detalle de un ticket: cabecera con sus acciones y pestañas de trabajo (AGENTS.md §5 "Detalle del ticket").
// Fuera del alcance del usuario responde 404 (§2.9 "Tickets: ver").
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { listTicketMaterials } from "@/features/inventory/queries/list-ticket-materials";
import { TicketActions } from "@/features/tickets/components/ticket-actions";
import { TicketHeader } from "@/features/tickets/components/ticket-header";
import { TicketTabs } from "@/features/tickets/components/ticket-tabs";
import { TicketTimer } from "@/features/tickets/components/ticket-timer";
import { getTicketBags } from "@/features/tickets/queries/get-ticket-bags";
import { getTicketDetail } from "@/features/tickets/queries/get-ticket-detail";
import { getTicketTime } from "@/features/tickets/queries/get-ticket-time";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Ticket" };

export default function TicketPage({ params }: PageProps<"/tickets/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/tickets"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tickets
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Ticket params={params} />
      </Suspense>
    </main>
  );
}

async function Ticket({ params }: Pick<PageProps<"/tickets/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const [detail, bags, time, materials] = await Promise.all([
    getTicketDetail(user, id),
    getTicketBags(user, id),
    getTicketTime(user, id),
    listTicketMaterials(user, id),
  ]);
  if (!detail || !bags || !time || !materials) notFound();
  return (
    <>
      <TicketHeader
        ticket={detail.ticket}
        actions={
          <TicketActions
            ticket={detail.ticket}
            permissions={detail.permissions}
            engineers={detail.engineers}
          />
        }
      />
      <TicketTimer ticketId={detail.ticket.id} time={time} />
      <TicketTabs
        detail={detail}
        bags={bags}
        time={time}
        materials={materials}
      />
    </>
  );
}
