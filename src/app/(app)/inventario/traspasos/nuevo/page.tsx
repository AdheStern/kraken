// src/app/(app)/inventario/traspasos/nuevo/page.tsx
// Nuevo traspaso: desde qué almacén, hacia cuál y qué viaja, escaneando como en el POS (AGENTS.md §2.8).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTransferForm } from "@/features/inventory/components/new-transfer-form";
import { getPosCatalog } from "@/features/inventory/queries/get-pos-catalog";
import { listWarehouseTabs } from "@/features/inventory/queries/list-warehouse-tabs";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Nuevo traspaso" };

export default function NewTransferPage({
  searchParams,
}: PageProps<"/inventario/traspasos/nuevo">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario/traspasos"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Traspasos
      </Link>
      <ModuleHeading
        title="Nuevo traspaso"
        description="Solo viaja lo disponible: lo reservado para un CV se queda en su almacén."
      />
      <Suspense
        fallback={
          <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-xl" />
        }
      >
        <NewTransfer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewTransfer({
  searchParams,
}: Pick<PageProps<"/inventario/traspasos/nuevo">, "searchParams">) {
  const user = await requireUser();
  if (!canOperateInventory(user)) notFound();
  const [params, tabs] = await Promise.all([searchParams, listWarehouseTabs()]);
  // REGLA: TRANSITO se usa solo por dentro del traspaso (§2.8).
  const warehouses = tabs.filter((t) => t.kind !== "TRANSITO");
  const origin =
    warehouses.find((w) => w.code === params.origen) ?? warehouses[0];
  if (!origin || warehouses.length < 2)
    return (
      <KrakenEmpty title="Hacen falta dos almacenes activos.">
        El administrador del sistema los crea en Administración → Almacenes.
      </KrakenEmpty>
    );
  const { items } = await getPosCatalog(user, origin.id);
  return (
    <NewTransferForm
      key={origin.id}
      warehouses={warehouses}
      origin={origin}
      catalog={items}
    />
  );
}
