// src/app/(app)/cliente/solicitudes/page.tsx
// Pedir trabajo desde el portal de clientes, si su empresa lo permite, y seguir el estado de lo pedido
// (AGENTS.md §2.11). DIMA convierte cada solicitud en un ticket de la empresa.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { MyTicketRequests } from "@/features/tickets/components/my-ticket-requests";
import { TicketRequestDialog } from "@/features/tickets/components/ticket-request-dialog";
import { listMyTicketRequests } from "@/features/tickets/queries/list-my-ticket-requests";
import { listRequestAreas } from "@/features/tickets/queries/list-request-areas";
import { canCustomerRequestWork } from "@/server/authz/ticket-request-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Pedir trabajo" };

export default function CustomerRequestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Pedir trabajo"
        description="Cuéntanos qué necesitas y qué área debe atenderlo. DIMA lo revisa y lo convierte en un ticket; te avisamos en cada paso."
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
  if (!canCustomerRequestWork(user)) return null;
  return <TicketRequestDialog areas={await listRequestAreas()} />;
}

async function Requests() {
  const user = await requireUser();
  if (!canCustomerRequestWork(user)) notFound();
  return <MyTicketRequests requests={await listMyTicketRequests(user)} />;
}
