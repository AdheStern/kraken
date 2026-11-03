// src/app/(app)/tableros/ingenieros/page.tsx
// Tablero de ingenieros: desempeño por ingeniero del periodo, con su alcance por rol (AGENTS.md §6). El ingeniero
// entra directo a su propio detalle.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/features/dashboards/components/dashboard-header";
import { EngineersTable } from "@/features/dashboards/components/engineers-table";
import { getEngineersDashboard } from "@/features/dashboards/queries/get-engineers-dashboard";
import { loadDashboardContext } from "@/features/dashboards/queries/load-dashboard-context";
import {
  canSeeEngineersDashboard,
  seesOtherEngineers,
} from "@/server/authz/dashboard-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tablero de ingenieros" };

export default function EngineersBoardPage({
  searchParams,
}: PageProps<"/tableros/ingenieros">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <EngineersBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EngineersBoard({
  searchParams,
}: Pick<PageProps<"/tableros/ingenieros">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeEngineersDashboard(user)) notFound();
  const context = await loadDashboardContext(user, await searchParams);
  if (!seesOtherEngineers(user))
    redirect(
      `/tableros/ingenieros/${user.id}${context.query ? `?${context.query}` : ""}`,
    );
  const board = await getEngineersDashboard(user, context.filters);
  return (
    <>
      <DashboardHeader
        context={context}
        active="ingenieros"
        description={`Tiempo, tickets y SLA de cada ingeniero en ${board.periodLabel}. Abre uno para ver su detalle y sus tickets.`}
      />
      <EngineersTable rows={board.rows} query={context.query} />
    </>
  );
}
