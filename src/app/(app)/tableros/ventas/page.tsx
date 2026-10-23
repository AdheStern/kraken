// src/app/(app)/tableros/ventas/page.tsx
// Tablero económico: ventas, margen, factor y horas vendidas del periodo, serie mensual contra la meta,
// desglose por dimensión y seguimiento comercial (AGENTS.md §6). Alcance por línea (§2.9 "Tableros").
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { resolvePeriod } from "@/domain/dashboards/period";
import { DashboardHeader } from "@/features/dashboards/components/dashboard-header";
import { SalesBreakdownTable } from "@/features/dashboards/components/sales-breakdown-table";
import { SalesFollowup } from "@/features/dashboards/components/sales-followup";
import { SalesKpis } from "@/features/dashboards/components/sales-kpis";
import { SalesMonthChart } from "@/features/dashboards/components/sales-month-chart";
import { getApprovalTimes } from "@/features/dashboards/queries/get-approval-times";
import { getPipeline } from "@/features/dashboards/queries/get-pipeline";
import { getRenewals } from "@/features/dashboards/queries/get-renewals";
import { getSalesDashboard } from "@/features/dashboards/queries/get-sales-dashboard";
import { loadDashboardContext } from "@/features/dashboards/queries/load-dashboard-context";
import { canSeeSalesDashboard } from "@/server/authz/dashboard-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tablero de ventas" };

export default function SalesBoardPage({
  searchParams,
}: PageProps<"/tableros/ventas">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <SalesBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SalesBoard({
  searchParams,
}: Pick<PageProps<"/tableros/ventas">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeSalesDashboard(user)) notFound();
  const context = await loadDashboardContext(user, await searchParams);
  const { filters } = context;
  const scope = { areaId: filters.areaId, cityId: filters.cityId };
  const period = resolvePeriod(filters.period);
  const [board, pipeline, renewals, approvals] = await Promise.all([
    getSalesDashboard(user, filters),
    getPipeline(user, scope),
    getRenewals(user, scope),
    getApprovalTimes(user, period),
  ]);
  return (
    <>
      <DashboardHeader
        context={context}
        active="ventas"
        description="Lo aprobado en el periodo con su margen, contra el periodo anterior y la meta."
      />
      <SalesKpis board={board} />
      {board.monthly.length > 1 ? (
        <section className="kr-solid flex flex-col gap-2 rounded-xl p-4">
          <h2 className="text-sm font-medium">
            Ventas por mes · {board.periodLabel}
          </h2>
          <SalesMonthChart months={board.monthly} />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Elige un trimestre o un año para ver la serie mensual contra la meta.
        </p>
      )}
      <SalesBreakdownTable breakdown={board.breakdown} query={context.query} />
      <SalesFollowup
        pipeline={pipeline}
        approvals={approvals}
        renewals={renewals}
      />
    </>
  );
}
