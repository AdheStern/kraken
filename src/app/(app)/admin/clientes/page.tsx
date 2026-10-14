// src/app/(app)/admin/clientes/page.tsx
// Catálogo de clientes con búsqueda por razón social o NIT (AGENTS.md §5 Administración). Lo gestionan
// Administración y el administrador del sistema (§2.9).
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { AdminSearch } from "@/features/admin/components/admin-search";
import { CustomerTable } from "@/features/admin/components/customer-table";
import { listCustomers } from "@/features/admin/queries/list-customers";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Clientes" };

export default function CustomersPage({
  searchParams,
}: PageProps<"/admin/clientes">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Clientes"
        description="Razón social, NIT y contactos. Un cliente dado de baja deja de ofrecerse en los CV nuevos; su historial no cambia."
        actions={
          <Link href="/admin/clientes/nuevo" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            Nuevo cliente
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Customers({
  searchParams,
}: Pick<PageProps<"/admin/clientes">, "searchParams">) {
  const user = await requireUser();
  if (!canManageCommercialCatalogs(user)) notFound();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const customers = await listCustomers(search);
  return (
    <>
      <AdminSearch
        action="/admin/clientes"
        defaultValue={search}
        placeholder="Buscar por razón social o NIT"
      />
      <CustomerTable customers={customers} search={search} />
    </>
  );
}
