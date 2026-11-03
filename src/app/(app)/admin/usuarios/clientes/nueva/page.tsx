// src/app/(app)/admin/usuarios/clientes/nueva/page.tsx
// Alta de la cuenta del portal de una empresa cliente (AGENTS.md §2.11). Solo el administrador del sistema.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { NewCustomerAccountForm } from "@/features/admin/components/new-customer-account-form";
import { listPortalCustomers } from "@/features/admin/queries/list-portal-customers";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Nueva cuenta de cliente" };

export default function NewCustomerAccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/usuarios" label="Usuarios y roles" />
      <ModuleHeading
        title="Nueva cuenta de cliente"
        description="Una cuenta por empresa. Entra con este correo y contraseña y ve solo sus tickets; lo demás se habilita abajo."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Form />
      </Suspense>
    </main>
  );
}

async function Form() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  return <NewCustomerAccountForm customers={await listPortalCustomers()} />;
}
