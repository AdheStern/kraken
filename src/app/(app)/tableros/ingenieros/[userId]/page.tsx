// src/app/(app)/tableros/ingenieros/[userId]/page.tsx
// Detalle del desempeño de un ingeniero en el periodo: cifras, tiempo por semana y sus tickets (AGENTS.md §6).
// Fuera del alcance del usuario responde 404 (scopeEngineerQuery).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/features/dashboards/components/dashboard-header";
import { EngineerKpis } from "@/features/dashboards/components/engineer-kpis";
import { EngineerTicketsTable } from "@/features/dashboards/components/engineer-tickets-table";
import { EngineerWeekChart } from "@/features/dashboards/components/engineer-week-chart";
import { getEngineerDetail } from "@/features/dashboards/queries/get-engineers-dashboard";
import { loadDashboardContext } from "@/features/dashboards/queries/load-dashboard-context";
import {
  canSeeEngineersDashboard,
  seesOtherEngineers,
} from "@/server/authz/dashboard-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Desempeño de un ingeniero" };

export default function EngineerDetailPage({
  params,
  searchParams,
}: PageProps<"/tableros/ingenieros/[userId]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <EngineerBoard params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EngineerBoard({
  params,
  searchParams,
}: Pick<
  PageProps<"/tableros/ingenieros/[userId]">,
  "params" | "searchParams"
>) {
  const user = await requireUser();
  if (!canSeeEngineersDashboard(user)) notFound();
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const context = await loadDashboardContext(user, query);
  const detail = await getEngineerDetail(
    user,
    decodeURIComponent(userId),
    context.filters,
  );
  if (!detail) notFound();
  return (
    <>
      <DashboardHeader
        context={context}
        active="ingenieros"
        showArea={false}
        description={`${detail.name} · ${detail.periodLabel}. El tiempo es el que registró; lo descontado, el de los tickets a su cargo cerrados en el periodo.`}
      />
      {seesOtherEngineers(user) && (
        <Link
          href={`/tableros/ingenieros${context.query ? `?${context.query}` : ""}`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Todos los ingenieros
        </Link>
      )}
      <EngineerKpis performance={detail.performance} />
      <EngineerWeekChart weeks={detail.weeks} />
      <EngineerTicketsTable tickets={detail.tickets} />
    </>
  );
}
