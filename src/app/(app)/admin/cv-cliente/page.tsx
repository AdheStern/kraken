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
import type { SessionUser } from "@/server/authz/roles";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Cliente de un CV" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CvCustomerPage({ searchParams }: Props) {
  const user = await requireUser();
  if (!canChangeCvCustomer(user)) notFound();
  const { q = "" } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Cliente de un CV"
        description="Corrige el cliente de un CV ya creado, en cualquier estado. Si sus bolsas de horas ya se usan en tickets, no se puede cambiar."
      />
      <AdminSearch
        action="/admin/cv-cliente"
        defaultValue={q}
        placeholder="Número del CV o cliente actual"
      />
      <Suspense
        key={q}
        fallback={<Skeleton className="h-48 w-full rounded-xl" />}
      >
        <Results user={user} search={q.trim()} />
      </Suspense>
    </main>
  );
}

async function Results({
  user,
  search,
}: {
  user: SessionUser;
  search: string;
}) {
  const [rows, customers] = await Promise.all([
    findCvsForCustomerChange(user, search),
    search === "" ? Promise.resolve([]) : listActiveCustomerChoices(),
  ]);
  return <CvCustomerList rows={rows} search={search} customers={customers} />;
}
