// src/app/(app)/admin/clientes/nuevo/page.tsx
// Alta de un cliente; al crearlo se abre su ficha para agregar contactos.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { CustomerForm } from "@/features/admin/components/customer-form";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NewCustomerPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/clientes" label="Clientes" />
      <ModuleHeading
        title="Nuevo cliente"
        description="Con la razón social basta para crearlo; el NIT evita que se registre dos veces."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <GuardedForm />
      </Suspense>
    </main>
  );
}

async function GuardedForm() {
  const user = await requireUser();
  if (!canManageCommercialCatalogs(user)) notFound();
  return <CustomerForm />;
}
