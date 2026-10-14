// src/app/(app)/admin/clientes/[id]/page.tsx
// Ficha de un cliente: sus datos, su estado y sus contactos (AGENTS.md §5 Administración).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { ContactsPanel } from "@/features/admin/components/contacts-panel";
import { CustomerForm } from "@/features/admin/components/customer-form";
import { CustomerStatusButton } from "@/features/admin/components/customer-status-button";
import { getCustomer } from "@/features/admin/queries/get-customer";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Cliente" };

export default function CustomerPage({
  params,
}: PageProps<"/admin/clientes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/clientes" label="Clientes" />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Customer params={params} />
      </Suspense>
    </main>
  );
}

async function Customer({
  params,
}: Pick<PageProps<"/admin/clientes/[id]">, "params">) {
  const user = await requireUser();
  if (!canManageCommercialCatalogs(user)) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return (
    <>
      <ModuleHeading
        title={customer.name}
        description={
          customer.isActive
            ? "Cliente activo: se ofrece al crear un CV."
            : "Dado de baja: no se ofrece en los CV nuevos. Reactívalo para volver a venderle."
        }
        actions={
          <CustomerStatusButton id={customer.id} isActive={customer.isActive} />
        }
      />
      <CustomerForm key={customer.id} customer={customer} />
      <section className="grid gap-3" aria-labelledby="contactos">
        <h2 id="contactos" className="text-sm font-medium">
          Contactos
        </h2>
        <ContactsPanel customerId={customer.id} contacts={customer.contacts} />
      </section>
    </>
  );
}
