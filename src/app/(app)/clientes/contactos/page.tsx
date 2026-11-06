// src/app/(app)/clientes/contactos/page.tsx
// Directorio de contactos de clientes: búsqueda general y por cliente, filtros y exportación a Excel con lo que se
// ve (decisión 2026-11-06). Lo ven quienes gestionan el catálogo, comerciales, preventa y gerencia.
import { FileDown } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getContactFormOptions } from "@/features/admin/queries/get-contact-form-options";
import { ContactDirectory } from "@/features/customers/components/contact-directory";
import { ContactFiltersBar } from "@/features/customers/components/contact-filters-bar";
import { toContactFilters } from "@/features/customers/contact-filters";
import { listContacts } from "@/features/customers/queries/list-contacts";
import { canBrowseContacts } from "@/server/authz/contact-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Contactos" };

export default function ContactsPage({
  searchParams,
}: PageProps<"/clientes/contactos">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Directory({
  searchParams,
}: Pick<PageProps<"/clientes/contactos">, "searchParams">) {
  const user = await requireUser();
  if (!canBrowseContacts(user)) notFound();
  const params = await searchParams;
  const filters = toContactFilters(params);
  const [contacts, options] = await Promise.all([
    listContacts(user, filters),
    getContactFormOptions(),
  ]);
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
  return (
    <>
      <ModuleHeading
        title="Contactos"
        tour="contactos"
        description="Las personas con quienes trata DIMA en cada cliente, dónde están y quiénes las atienden."
        actions={
          <a
            href={`/api/customers/contacts.xlsx?${query}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileDown aria-hidden="true" />
            Exportar a Excel
          </a>
        }
      />
      <ContactFiltersBar
        customers={options.customers}
        areas={options.areas}
        users={options.users}
      />
      <p className="text-xs text-muted-foreground">
        {contacts.length === 200
          ? "Primeros 200; afina la búsqueda o exporta todo."
          : `${contacts.length} contactos`}
      </p>
      <ContactDirectory contacts={contacts} />
    </>
  );
}
