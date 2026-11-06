// src/app/(app)/admin/clientes/[id]/page.tsx
// Ficha de un cliente en pestañas: sus datos, sus sucursales y sus contactos (AGENTS.md §5 Administración,
// decisión 2026-11-06); ?pestana= abre una.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { z } from "zod";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { BranchesPanel } from "@/features/admin/components/branches-panel";
import { ContactsPanel } from "@/features/admin/components/contacts-panel";
import { CustomerForm } from "@/features/admin/components/customer-form";
import { CustomerStatusButton } from "@/features/admin/components/customer-status-button";
import { CustomerTabs } from "@/features/admin/components/customer-tabs";
import { getContactFormOptions } from "@/features/admin/queries/get-contact-form-options";
import { getCustomer } from "@/features/admin/queries/get-customer";
import { getCustomerFormOptions } from "@/features/admin/queries/get-customer-form-options";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

// POR QUÉ: cache() comparte la lectura entre el título de la pestaña y la página.
const loadCustomer = cache(async (id: string) => {
  const user = await requireUser();
  if (!canManageCommercialCatalogs(user)) return null;
  return z.uuid().safeParse(id).success ? getCustomer(id) : null;
});

export async function generateMetadata({
  params,
}: PageProps<"/admin/clientes/[id]">): Promise<Metadata> {
  const customer = await loadCustomer((await params).id);
  return { title: customer?.name ?? "Cliente" };
}

export default function CustomerPage({
  params,
  searchParams,
}: PageProps<"/admin/clientes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/clientes" label="Clientes" />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Customer params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const TABS = ["datos", "sucursales", "contactos"];

async function Customer({
  params,
  searchParams,
}: Pick<PageProps<"/admin/clientes/[id]">, "params" | "searchParams">) {
  const [customer, { pestana }] = await Promise.all([
    params.then(({ id }) => loadCustomer(id)),
    searchParams,
  ]);
  if (!customer) notFound();
  const [options, contactOptions] = await Promise.all([
    getCustomerFormOptions(),
    getContactFormOptions(),
  ]);
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
      <CustomerTabs
        initial={
          typeof pestana === "string" && TABS.includes(pestana)
            ? pestana
            : "datos"
        }
        counts={{
          branches: customer.branches.length,
          contacts: customer.contacts.length,
        }}
        data={
          <CustomerForm
            key={customer.id}
            customer={customer}
            options={options}
          />
        }
        branches={
          <BranchesPanel
            customerId={customer.id}
            branches={customer.branches}
            municipalities={options.municipalities}
          />
        }
        contacts={
          <ContactsPanel
            customerId={customer.id}
            contacts={customer.contacts}
            options={{
              ...contactOptions,
              municipalities: options.municipalities,
              branches: customer.branches
                .filter((b) => b.isActive)
                .map((b) => ({ id: b.id, label: b.name })),
            }}
          />
        }
      />
    </>
  );
}
