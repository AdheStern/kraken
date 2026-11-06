// src/app/(app)/clientes/[id]/page.tsx
// Ficha de un cliente en pestañas: sus datos, sus sucursales y sus contactos (decisión 2026-11-06); ?pestana= abre
// una. Quien no gestiona clientes la ve de solo lectura, agrega contactos y ve los de sus áreas (§2.9).
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
import {
  canBrowseContacts,
  canManageContacts,
  canManageCustomers,
} from "@/server/authz/contact-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { requireUser } from "@/server/session";

// POR QUÉ: cache() comparte la lectura entre el título de la pestaña y la página.
const loadCustomer = cache(async (id: string) => {
  const user = await requireUser();
  if (!canBrowseContacts(user) || !z.uuid().safeParse(id).success) return null;
  const customer = await getCustomer(user, id);
  return customer ? { user, customer } : null;
});

export async function generateMetadata({
  params,
}: PageProps<"/clientes/[id]">): Promise<Metadata> {
  const loaded = await loadCustomer((await params).id);
  return { title: loaded?.customer.name ?? "Cliente" };
}

export default function CustomerPage({
  params,
  searchParams,
}: PageProps<"/clientes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/clientes" label="Clientes" />
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
}: Pick<PageProps<"/clientes/[id]">, "params" | "searchParams">) {
  const [loaded, { pestana }] = await Promise.all([
    params.then(({ id }) => loadCustomer(id)),
    searchParams,
  ]);
  if (!loaded) notFound();
  const { user, customer } = loaded;
  const can = permissions(user);
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
          can.manageCustomer && (
            <CustomerStatusButton
              id={customer.id}
              isActive={customer.isActive}
            />
          )
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
            readOnly={!can.manageCustomer}
          />
        }
        branches={
          <BranchesPanel
            customerId={customer.id}
            branches={customer.branches}
            municipalities={options.municipalities}
            canManage={can.manageCustomer}
          />
        }
        contacts={
          <ContactsPanel
            customerId={customer.id}
            contacts={customer.contacts}
            canManage={can.manageContacts}
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

function permissions(user: SessionUser) {
  return {
    manageCustomer: canManageCustomers(user),
    manageContacts: canManageContacts(user),
  };
}
