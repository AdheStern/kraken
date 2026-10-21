// src/app/(app)/inventario/ajustes/nuevo/page.tsx
// Pedir un ajuste manual de inventario (AGENTS.md §2.8). Solo para quien opera inventario (§2.9).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ManualAdjustmentForm } from "@/features/inventory/components/manual-adjustment-form";
import { listAreaOptions } from "@/features/inventory/queries/list-area-options";
import { listWarehouseTabs } from "@/features/inventory/queries/list-warehouse-tabs";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Nuevo ajuste" };

export default function NewAdjustmentPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario/ajustes"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Ajustes
      </Link>
      <ModuleHeading
        title="Nuevo ajuste"
        description="Escribe la diferencia con signo: +3 si sobra, −2 si falta. Lo que entra vale al costo promedio del almacén; si no hay stock, al costo que indiques."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <NewAdjustment />
      </Suspense>
    </main>
  );
}

async function NewAdjustment() {
  const user = await requireUser();
  if (!canOperateInventory(user)) notFound();
  const [tabs, areas] = await Promise.all([
    listWarehouseTabs(),
    listAreaOptions(),
  ]);
  // REGLA: en tránsito solo se dan de baja diferencias de traspaso, desde el traspaso (§2.8).
  const warehouses = tabs
    .filter((t) => t.kind !== "TRANSITO")
    .map((t) => ({ id: t.id, label: t.name }));
  return <ManualAdjustmentForm warehouses={warehouses} areas={areas} />;
}
