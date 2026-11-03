// src/app/(app)/cliente/tickets/[id]/page.tsx
// Detalle de un ticket en el portal de clientes (AGENTS.md §2.11). Fuera de su empresa responde 404.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerTicketView } from "@/features/tickets/components/customer-ticket-view";
import { getCustomerTicket } from "@/features/tickets/queries/get-customer-ticket";
import { requireUser } from "@/server/session";

export default function CustomerTicketPage({
  params,
}: PageProps<"/cliente/tickets/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/cliente/tickets"
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

async function Ticket({
  params,
}: Pick<PageProps<"/cliente/tickets/[id]">, "params">) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  if (!user.customer) notFound();
  const ticket = await getCustomerTicket(user, id);
  if (!ticket) notFound();
  return <CustomerTicketView ticket={ticket} />;
}
