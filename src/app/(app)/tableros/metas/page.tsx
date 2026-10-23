// src/app/(app)/tableros/metas/page.tsx
// Metas (KGI) mensuales por área y de la empresa: el GG define todas y el gerente de área las suyas (AGENTS.md
// §6, §2.9 "Tableros"). Indicador y año viven en la URL.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { toBusinessYear } from "@/domain/calendar/business-date";
import { BoardTabs } from "@/features/dashboards/components/board-tabs";
import { GoalsGrid } from "@/features/dashboards/components/goals-grid";
import { getGoalsGrid } from "@/features/dashboards/queries/get-goals-grid";
import { visibleBoards } from "@/features/dashboards/queries/load-dashboard-context";
import { GOAL_INDICATORS } from "@/features/dashboards/schemas/goal-schema";
import { cn } from "@/lib/utils";
import { canEditGoals } from "@/server/authz/dashboard-permissions";
import { systemClock } from "@/server/clock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Metas" };

const INDICATOR_LABELS = {
  VENTAS_USD: "Ventas",
  MARGEN_USD: "Margen bruto",
  HORAS_VENDIDAS: "Horas vendidas",
} as const;

type Indicator = (typeof GOAL_INDICATORS)[number];

export default function GoalsPage({
  searchParams,
}: PageProps<"/tableros/metas">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Goals searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Goals({
  searchParams,
}: Pick<PageProps<"/tableros/metas">, "searchParams">) {
  const user = await requireUser();
  if (!canEditGoals(user)) notFound();
  const params = await searchParams;
  const current = toBusinessYear(systemClock.now());
  const year =
    [current - 1, current, current + 1].find(
      (y) => String(y) === params.anio,
    ) ?? current;
  const indicator: Indicator =
    GOAL_INDICATORS.find((i) => i === params.indicador) ?? "VENTAS_USD";
  const rows = await getGoalsGrid(user, year, indicator);
  const link = (next: { anio?: number; indicador?: Indicator }) =>
    `/tableros/metas?anio=${next.anio ?? year}&indicador=${next.indicador ?? indicator}`;
  return (
    <>
      <ModuleHeading
        title="Metas"
        description="Lo que cada área se propone vender, ganar y colocar en horas cada mes."
      />
      <BoardTabs boards={visibleBoards(user)} active="metas" query="" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pills
          label="Indicador"
          items={GOAL_INDICATORS.map((i) => ({
            key: i,
            label: INDICATOR_LABELS[i],
            href: link({ indicador: i }),
          }))}
          active={indicator}
        />
        <Pills
          label="Año"
          items={[current - 1, current, current + 1].map((y) => ({
            key: String(y),
            label: String(y),
            href: link({ anio: y }),
          }))}
          active={String(year)}
        />
      </div>
      <GoalsGrid rows={rows} year={year} indicator={indicator} />
    </>
  );
}

type PillsProps = {
  label: string;
  items: { key: string; label: string; href: string }[];
  active: string;
};

function Pills({ label, items, active }: PillsProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === active ? "true" : undefined}
          className={cn(
            "rounded-lg px-2.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            item.key === active && "bg-muted text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
