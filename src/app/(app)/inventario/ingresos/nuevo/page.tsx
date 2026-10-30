// src/app/(app)/inventario/ingresos/nuevo/page.tsx
// Registrar un ingreso: compra local, importación o la carga del inventario inicial, escribiendo o pegando desde
// Excel (AGENTS.md §2.8). Solo para quien opera inventario (§2.9).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { FreshAfterCreate } from "@/components/forms/fresh-after-create";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptForm } from "@/features/inventory/components/receipt-form";
import { listWarehouseTabs } from "@/features/inventory/queries/list-warehouse-tabs";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Registrar ingreso" };

export default function NewReceiptPage({
  searchParams,
}: PageProps<"/inventario/ingresos/nuevo">) {
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
        title="Registrar ingreso"
        description="Escribe las líneas o pégalas desde Excel en este orden: código, descripción, cantidad, costo unitario USD y seriales separados por coma. Un código que no existe crea el producto para que Administración lo revise."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <NewReceipt searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewReceipt({
  searchParams,
}: Pick<PageProps<"/inventario/ingresos/nuevo">, "searchParams">) {
  const user = await requireUser();
  if (!canOperateInventory(user)) notFound();
  const [params, tabs] = await Promise.all([searchParams, listWarehouseTabs()]);
  // REGLA: a TRANSITO solo llegan traspasos (§2.8).
  const warehouses = tabs.filter((t) => t.kind !== "TRANSITO");
  const [first] = warehouses;
  if (!first)
    return (
      <KrakenEmpty title="No hay almacenes donde ingresar.">
        El administrador del sistema los crea en Administración → Almacenes.
      </KrakenEmpty>
    );
  const chosen = warehouses.find((w) => w.code === params.almacen) ?? first;
  return (
    <FreshAfterCreate>
      <ReceiptForm warehouses={warehouses} defaultWarehouseId={chosen.id} />
    </FreshAfterCreate>
  );
}
