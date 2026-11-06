// src/app/(app)/clientes/page.tsx
// Clientes con búsqueda por razón social o NIT, para todo el personal (decisión 2026-11-06): quien gestiona
// clientes los crea; el resto abre la ficha para ver y agregar contactos (§2.9).
import { BookUser, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSearch } from "@/features/admin/components/admin-search";
import { CustomerTable } from "@/features/admin/components/customer-table";
import { listCustomers } from "@/features/admin/queries/list-customers";
import {
  canBrowseContacts,
  canManageCustomers,
} from "@/server/authz/contact-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Clientes" };

export default function CustomersPage({
  searchParams,
}: PageProps<"/clientes">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Customers({
  searchParams,
}: Pick<PageProps<"/clientes">, "searchParams">) {
  const user = await requireUser();
  if (!canBrowseContacts(user)) notFound();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const customers = await listCustomers(search);
  return (
    <>
      <ModuleHeading
        title="Clientes"
        description="Razón social, NIT, sucursales y contactos. Un cliente dado de baja deja de ofrecerse en los CV nuevos; su historial no cambia."
        actions={
          <>
            <Link
              href="/clientes/contactos"
              className={buttonVariants({ variant: "outline" })}
            >
              <BookUser aria-hidden="true" />
              Directorio de contactos
            </Link>
            {canManageCustomers(user) && (
              <Link href="/clientes/nuevo" className={buttonVariants()}>
                <Plus aria-hidden="true" />
                Nuevo cliente
              </Link>
            )}
          </>
        }
      />
      <AdminSearch
        action="/clientes"
        defaultValue={search}
        placeholder="Buscar por razón social o NIT"
      />
      <CustomerTable customers={customers} search={search} />
    </>
  );
}
