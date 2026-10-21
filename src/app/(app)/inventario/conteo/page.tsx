// src/app/(app)/inventario/conteo/page.tsx
// Conteo físico de un almacén: la foto del sistema es la de este instante; las diferencias piden un ajuste
// (AGENTS.md §2.8; criterio de salida de la F4). Solo para quien opera inventario (§2.9).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { CountForm } from "@/features/inventory/components/count-form";
import { WarehouseTabs } from "@/features/inventory/components/warehouse-tabs";
import { getPosCatalog } from "@/features/inventory/queries/get-pos-catalog";
import { listWarehouseTabs } from "@/features/inventory/queries/list-warehouse-tabs";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { systemClock } from "@/server/clock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Conteo físico" };

export default function CountPage({
  searchParams,
}: PageProps<"/inventario/conteo">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Inventario
      </Link>
      <ModuleHeading
        title="Conteo físico"
        description="Escanea o escribe lo que hay. Se compara con el sistema en el momento en que abriste esta pantalla; lo que se mueva mientras cuentas no cuenta como diferencia."
      />
      <Suspense
        fallback={
          <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-xl" />
        }
      >
        <Count searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Count({
  searchParams,
}: Pick<PageProps<"/inventario/conteo">, "searchParams">) {
  const user = await requireUser();
  if (!canOperateInventory(user)) notFound();
  const [params, tabs] = await Promise.all([searchParams, listWarehouseTabs()]);
  // REGLA: en tránsito no se cuenta; sus diferencias se resuelven desde cada traspaso (§2.8).
  const warehouses = tabs.filter((t) => t.kind !== "TRANSITO");
  const warehouse =
    warehouses.find((w) => w.code === params.almacen) ?? warehouses[0];
  if (!warehouse)
    return (
      <KrakenEmpty title="No hay almacenes para contar.">
        El administrador del sistema los crea en Administración → Almacenes.
      </KrakenEmpty>
    );
  const startedAt = systemClock.now().toISOString();
  const { items } = await getPosCatalog(user, warehouse.id);
  return (
    <>
      <WarehouseTabs
        tabs={warehouses}
        activeCode={warehouse.code}
        search=""
        basePath="/inventario/conteo"
      />
      <CountForm
        key={`${warehouse.id}-${startedAt}`}
        warehouseId={warehouse.id}
        startedAt={startedAt}
        catalog={items}
      />
    </>
  );
}
