// src/app/(app)/tickets/[id]/page.tsx
// Detalle de un ticket: cabecera con sus acciones y pestañas de trabajo (AGENTS.md §5 "Detalle del ticket").
// Fuera del alcance del usuario responde 404 (§2.9 "Tickets: ver").
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { listTicketMaterials } from "@/features/inventory/queries/list-ticket-materials";
import { AutoRefresh } from "@/features/tickets/components/auto-refresh";
import { TicketActions } from "@/features/tickets/components/ticket-actions";
import { TicketHeader } from "@/features/tickets/components/ticket-header";
import { TicketTabs } from "@/features/tickets/components/ticket-tabs";
import { TicketTimer } from "@/features/tickets/components/ticket-timer";
import { getTicketBags } from "@/features/tickets/queries/get-ticket-bags";
import { getTicketDetail } from "@/features/tickets/queries/get-ticket-detail";
import { getTicketSummary } from "@/features/tickets/queries/get-ticket-summary";
import { getTicketTime } from "@/features/tickets/queries/get-ticket-time";
import { requireUser } from "@/server/session";

// POR QUÉ: cache() comparte la lectura del detalle entre el título de la pestaña y la página.
const loadTicketDetail = cache(getTicketDetail);

export async function generateMetadata({
  params,
}: PageProps<"/tickets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadTicketDetail(await requireUser(), id);
  return {
    title: detail
      ? `#${detail.ticket.number} ${detail.ticket.title}`
      : "Ticket",
  };
}

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
  const [detail, bags, time, materials, summary] = await Promise.all([
    loadTicketDetail(user, id),
    getTicketBags(user, id),
    getTicketTime(user, id),
    listTicketMaterials(user, id),
    getTicketSummary(user, id),
  ]);
  if (!detail || !bags || !time || !materials) notFound();
  return (
    <>
      <AutoRefresh />
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
        summary={summary}
      />
    </>
  );
}
