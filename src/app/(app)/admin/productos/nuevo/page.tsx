// src/app/(app)/admin/productos/nuevo/page.tsx
// Alta de un producto del catálogo; al crearlo se abre su ficha.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { ProductForm } from "@/features/admin/components/product-form";
import { getProductFormOptions } from "@/features/admin/queries/get-product";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/productos" label="Productos" />
      <ModuleHeading
        title="Nuevo producto"
        description="El código y la descripción se copian a la línea del CV al elegirlo; ahí se pueden ajustar."
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
  return <ProductForm options={await getProductFormOptions()} />;
}
