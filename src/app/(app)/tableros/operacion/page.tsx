// src/app/(app)/tableros/operacion/page.tsx
// Tablero operativo: horas vendidas y consumidas, SLA, tickets, registros, bolsas en riesgo y utilización por
// ingeniero (AGENTS.md §6). Sin montos; cada rol ve su alcance (§2.9 "Tableros").
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/features/dashboards/components/dashboard-header";
import { OperationsKpis } from "@/features/dashboards/components/operations-kpis";
import { OperationsPanels } from "@/features/dashboards/components/operations-panels";
import { UtilizationTable } from "@/features/dashboards/components/utilization-table";
import { getOperationsDashboard } from "@/features/dashboards/queries/get-operations-dashboard";
import { loadDashboardContext } from "@/features/dashboards/queries/load-dashboard-context";
import { canSeeOperationsDashboard } from "@/server/authz/dashboard-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tablero de operación" };

export default function OperationsBoardPage({
  searchParams,
}: PageProps<"/tableros/operacion">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <OperationsBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OperationsBoard({
  searchParams,
}: Pick<PageProps<"/tableros/operacion">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeOperationsDashboard(user)) notFound();
  const context = await loadDashboardContext(user, await searchParams);
  const board = await getOperationsDashboard(user, context.filters);
  return (
    <>
      <DashboardHeader
        context={context}
        active="operacion"
        description={`Horas, tickets y SLA de ${board.periodLabel}; las bolsas en riesgo son las de hoy.`}
      />
      <OperationsKpis board={board} />
      <OperationsPanels board={board} />
      <UtilizationTable rows={board.utilization} />
    </>
  );
}
