// src/app/(app)/inventario/pos/page.tsx
// POS interno: salidas a CV, ticket o uso interno escaneando seriales o códigos, en una columna para tablet
// (AGENTS.md §2.8, §5). Solo para quien opera inventario (§2.9).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PosScreen } from "@/features/inventory/components/pos-screen";
import { getPosCatalog } from "@/features/inventory/queries/get-pos-catalog";
import { listWarehouseTabs } from "@/features/inventory/queries/list-warehouse-tabs";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "POS interno" };

export default function PosPage({
  searchParams,
}: PageProps<"/inventario/pos">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="POS interno"
        description="Escanea lo que sale, elige a dónde va y confirma; el comprobante queda listo para descargar."
      />
      <Suspense
        fallback={
          <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-xl" />
        }
      >
        <Pos searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Pos({
  searchParams,
}: Pick<PageProps<"/inventario/pos">, "searchParams">) {
  const user = await requireUser();
  if (!canOperateInventory(user)) notFound();
  const [params, tabs] = await Promise.all([searchParams, listWarehouseTabs()]);
  // REGLA: desde tránsito no hay salidas (§2.8).
  const warehouses = tabs.filter((t) => t.kind !== "TRANSITO");
  const requested = warehouses.find((w) => w.code === params.almacen);
  const warehouse = requested ?? warehouses[0];
  if (!warehouse)
    return (
      <KrakenEmpty title="No hay almacenes desde donde despachar.">
        El administrador del sistema los crea en Administración → Almacenes.
      </KrakenEmpty>
    );
  const { items, reservations } = await getPosCatalog(user, warehouse.id);
  return (
    <PosScreen
      key={warehouse.id}
      warehouses={warehouses}
      warehouse={warehouse}
      catalog={items}
      reservations={reservations}
      isDefaultWarehouse={!requested}
    />
  );
}
