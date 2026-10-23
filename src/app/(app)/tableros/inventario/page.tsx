// src/app/(app)/tableros/inventario/page.tsx
// Tablero de inventario: valor por almacén, salidas netas, rotación y tránsito (AGENTS.md §2.8 y §6). Solo para
// quien ve costos de inventario (§2.9 "Tableros").
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/features/dashboards/components/dashboard-header";
import { InventoryBoard } from "@/features/dashboards/components/inventory-board";
import { getInventoryDashboard } from "@/features/dashboards/queries/get-inventory-dashboard";
import { loadDashboardContext } from "@/features/dashboards/queries/load-dashboard-context";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tablero de inventario" };

export default function InventoryBoardPage({
  searchParams,
}: PageProps<"/tableros/inventario">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Board({
  searchParams,
}: Pick<PageProps<"/tableros/inventario">, "searchParams">) {
  const user = await requireUser();
  const context = await loadDashboardContext(user, await searchParams);
  const board = await getInventoryDashboard(user, context.filters);
  if (!board) notFound();
  return (
    <>
      <DashboardHeader
        context={context}
        active="inventario"
        description="Lo que vale el stock, lo que salió y cuántas veces rotó en el periodo."
        showArea={false}
      />
      <InventoryBoard board={board} />
    </>
  );
}
