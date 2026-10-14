// src/app/(app)/admin/productos/page.tsx
// Catálogo de productos con búsqueda y el filtro "por revisar" de los creados desde un CV (AGENTS.md §2.1,
// §5 Administración). Lo gestionan Administración y el administrador del sistema (§2.9).
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
import { ProductTable } from "@/features/admin/components/product-table";
import { listProducts } from "@/features/admin/queries/list-products";
import { cn } from "@/lib/utils";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Productos" };

export default function ProductsPage({
  searchParams,
}: PageProps<"/admin/productos">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Productos"
        description="El mismo catálogo del CV y del inventario. Los creados desde el editor del CV quedan por revisar."
        actions={
          <Link href="/admin/productos/nuevo" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            Nuevo producto
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Products({
  searchParams,
}: Pick<PageProps<"/admin/productos">, "searchParams">) {
  const user = await requireUser();
  if (!canManageCommercialCatalogs(user)) notFound();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const onlyToReview = params.ver === "revisar";
  const { rows, toReview } = await listProducts(search, onlyToReview);
  const tab = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm",
      active
        ? "bg-primary/10 font-medium text-primary"
        : "text-muted-foreground hover:text-foreground",
    );
  const query = search ? `q=${encodeURIComponent(search)}` : "";
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch
          action="/admin/productos"
          defaultValue={search}
          placeholder="Buscar por código o descripción"
        />
        <nav className="flex gap-1" aria-label="Filtrar productos">
          <Link
            href={`/admin/productos?${query}`}
            className={tab(!onlyToReview)}
            aria-current={!onlyToReview ? "page" : undefined}
          >
            Todos
          </Link>
          <Link
            href={`/admin/productos?ver=revisar${query ? `&${query}` : ""}`}
            className={tab(onlyToReview)}
            aria-current={onlyToReview ? "page" : undefined}
          >
            Por revisar <span className="tabular-nums">({toReview})</span>
          </Link>
        </nav>
      </div>
      <ProductTable
        products={rows}
        search={search}
        onlyToReview={onlyToReview}
      />
    </>
  );
}
