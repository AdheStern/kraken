// src/app/(app)/inventario/page.tsx
// Stock por almacén con lo reservado para los CV aprobados y lo disponible; buscable por código o serial
// (AGENTS.md §2.8, §5 navegación "Inventario"). Costos y kardex solo para quien los ve (§2.9).
import { ArrowLeftRight, PackagePlus, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockSearch } from "@/features/inventory/components/stock-search";
import { StockTable } from "@/features/inventory/components/stock-table";
import { WarehouseTabs } from "@/features/inventory/components/warehouse-tabs";
import { listStock } from "@/features/inventory/queries/list-stock";
import { listWarehouseTabs } from "@/features/inventory/queries/list-warehouse-tabs";
import {
  canOperateInventory,
  canSeeInventory,
  canSeeInventoryCosts,
} from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Inventario" };

export default function InventoryPage({
  searchParams,
}: PageProps<"/inventario">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Inventario"
        description="Stock de cada almacén, lo reservado para los CV aprobados y lo que queda disponible."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <InventoryResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function InventoryResults({
  searchParams,
}: Pick<PageProps<"/inventario">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeInventory(user)) notFound();
  const [params, tabs] = await Promise.all([searchParams, listWarehouseTabs()]);
  if (tabs.length === 0)
    return (
      <KrakenEmpty title="No hay almacenes activos.">
        El administrador del sistema los crea en Administración → Almacenes.
      </KrakenEmpty>
    );
  const active =
    tabs.find((t) => t.code === params.almacen) ??
    (tabs[0] as (typeof tabs)[number]);
  const search = typeof params.q === "string" ? params.q : "";
  const rows = await listStock(user, {
    warehouseId: active.id,
    isTransit: active.kind === "TRANSITO",
    search,
  });
  return (
    <>
      <WarehouseTabs tabs={tabs} activeCode={active.code} search={search} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StockSearch warehouseCode={active.code} defaultValue={search} />
        {canOperateInventory(user) && active.kind !== "TRANSITO" && (
          <div className="flex gap-2">
            <Link
              href="/inventario/traspasos"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeftRight aria-hidden="true" />
              Traspasos
            </Link>
            <Link
              href={`/inventario/pos?almacen=${encodeURIComponent(active.code)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ScanLine aria-hidden="true" />
              POS
            </Link>
            <Link
              href={`/inventario/ingresos/nuevo?almacen=${encodeURIComponent(active.code)}`}
              className={buttonVariants()}
            >
              <PackagePlus aria-hidden="true" />
              Registrar ingreso
            </Link>
          </div>
        )}
      </div>
      {rows.length > 0 ? (
        <StockTable
          rows={rows}
          warehouseCode={active.code}
          showCosts={canSeeInventoryCosts(user)}
        />
      ) : search ? (
        <KrakenEmpty
          compact
          title={`Nada coincide con «${search}» en ${active.name}.`}
        >
          Prueba con otro código, parte de la descripción o el serial completo.
        </KrakenEmpty>
      ) : (
        <KrakenEmpty compact title={`${active.name} no tiene stock.`}>
          {canOperateInventory(user)
            ? "Registra un ingreso o recibe un traspaso para empezar."
            : "Cuando ingrese mercadería a este almacén, aparecerá aquí."}
        </KrakenEmpty>
      )}
    </>
  );
}
