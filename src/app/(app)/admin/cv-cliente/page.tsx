// src/app/(app)/admin/cv-cliente/page.tsx
// Cambio del cliente de un CV (§2.3, decisión 2026-11-12): solo el administrador del sistema; busca por número o
// cliente y muestra la cabecera, nunca montos (§2.9).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { AdminSearch } from "@/features/admin/components/admin-search";
import { CvCustomerList } from "@/features/admin/components/cv-customer-list";
import {
  findCvsForCustomerChange,
  listActiveCustomerChoices,
} from "@/features/admin/queries/find-cvs-for-customer-change";
import { canChangeCvCustomer } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Cliente de un CV" };

export default function CvCustomerPage({
  searchParams,
}: PageProps<"/admin/cv-cliente">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Cliente de un CV"
        description="Corrige el cliente de un CV ya creado, en cualquier estado. Si sus bolsas de horas ya se usan en tickets, no se puede cambiar."
      />
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// TRAMPA: con Cache Components la sesión y searchParams se leen dentro de Suspense; fuera rompen el prerender.
async function Results({
  searchParams,
}: Pick<PageProps<"/admin/cv-cliente">, "searchParams">) {
  const user = await requireUser();
  if (!canChangeCvCustomer(user)) notFound();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const [rows, customers] = await Promise.all([
    findCvsForCustomerChange(user, search),
    search === "" ? Promise.resolve([]) : listActiveCustomerChoices(),
  ]);
  return (
    <>
      <AdminSearch
        action="/admin/cv-cliente"
        defaultValue={search}
        placeholder="Número del CV o cliente actual"
      />
      <CvCustomerList rows={rows} search={search} customers={customers} />
    </>
  );
}
