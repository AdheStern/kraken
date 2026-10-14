// src/app/(app)/admin/catalogos/[kind]/page.tsx
// Un catálogo simple (áreas, ciudades, tecnologías, unidades, tipos de servicio o proveedores) con su alta,
// edición y baja lógica (AGENTS.md §5 Administración). Cada catálogo exige su permiso (§2.9).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { canManageAdminAccess } from "@/features/admin/admin-access";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { SimpleCatalogPanel } from "@/features/admin/components/simple-catalog-panel";
import { listSimpleCatalog } from "@/features/admin/queries/list-simple-catalog";
import {
  isSimpleCatalogKind,
  SIMPLE_CATALOGS,
} from "@/features/admin/simple-catalogs";
import { requireUser } from "@/server/session";

export async function generateMetadata({
  params,
}: PageProps<"/admin/catalogos/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return {
    title: isSimpleCatalogKind(kind) ? SIMPLE_CATALOGS[kind].title : "Catálogo",
  };
}

export default function SimpleCatalogPage({
  params,
}: PageProps<"/admin/catalogos/[kind]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Catalog params={params} />
      </Suspense>
    </main>
  );
}

async function Catalog({
  params,
}: Pick<PageProps<"/admin/catalogos/[kind]">, "params">) {
  const { kind } = await params;
  if (!isSimpleCatalogKind(kind)) notFound();
  const config = SIMPLE_CATALOGS[kind];
  const user = await requireUser();
  if (!canManageAdminAccess(user, config.access)) notFound();
  const items = await listSimpleCatalog(kind);
  return (
    <>
      <ModuleHeading title={config.title} description={config.description} />
      <SimpleCatalogPanel kind={kind} items={items} />
    </>
  );
}
