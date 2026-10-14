// src/app/(app)/admin/productos/[id]/page.tsx
// Ficha de un producto: sus datos, su revisión si vino de un CV y su estado (AGENTS.md §2.1, §5).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { ProductForm } from "@/features/admin/components/product-form";
import { ProductStatusActions } from "@/features/admin/components/product-status-actions";
import {
  getProduct,
  getProductFormOptions,
} from "@/features/admin/queries/get-product";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Producto" };

export default function ProductPage({
  params,
}: PageProps<"/admin/productos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/productos" label="Productos" />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Product params={params} />
      </Suspense>
    </main>
  );
}

async function Product({
  params,
}: Pick<PageProps<"/admin/productos/[id]">, "params">) {
  const user = await requireUser();
  if (!canManageCommercialCatalogs(user)) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const product = await getProduct(id);
  if (!product) notFound();
  const options = await getProductFormOptions(product);
  return (
    <>
      <ModuleHeading
        title={product.code}
        description={statusText(product)}
        actions={
          <ProductStatusActions
            id={product.id}
            isActive={product.isActive}
            createdFromCv={product.createdFromCv}
          />
        }
      />
      <ProductForm key={product.id} product={product} options={options} />
    </>
  );
}

function statusText(p: { isActive: boolean; createdFromCv: boolean }) {
  if (!p.isActive)
    return "Dado de baja: no se ofrece en la grilla del CV. Reactívalo para volver a usarlo.";
  if (p.createdFromCv)
    return "Creado desde el editor de un CV. Revisa código, tecnología y unidad, y dalo por revisado.";
  return "Activo: se ofrece en la grilla del CV.";
}
