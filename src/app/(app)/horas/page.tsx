// src/app/(app)/horas/page.tsx
// Seguimiento de bolsas de horas visibles para el usuario: primero las en riesgo, con filtro por cliente y
// estado (AGENTS.md §2.4, §5 navegación "Horas y tickets").
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BagFilters } from "@/features/hours/components/bag-filters";
import { BagRiskList } from "@/features/hours/components/bag-risk-list";
import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import { BagStatus } from "@/generated/prisma/enums";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Bolsas de horas" };

export default function HourBagsPage({ searchParams }: PageProps<"/horas">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Bolsas de horas
        </h1>
        <p className="text-sm text-muted-foreground">
          Horas vendidas en los CV aprobados, su consumo y su vencimiento.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <HourBagsResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HourBagsResults({
  searchParams,
}: Pick<PageProps<"/horas">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeHourBags(user)) notFound();
  const [params, bags] = await Promise.all([searchParams, listHourBags(user)]);
  const customerId = typeof params.cliente === "string" ? params.cliente : null;
  const status =
    typeof params.estado === "string" && params.estado in BagStatus
      ? params.estado
      : null;
  // POR QUÉ: se filtra en memoria para que la lista de clientes del filtro no se encoja al elegir uno.
  const visible = bags.filter(
    (bag) =>
      (!customerId || bag.customerId === customerId) &&
      (!status || bag.status === status),
  );
  const customers = [
    ...new Map(bags.map((b) => [b.customerId, b.customerName])).entries(),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <>
      {bags.length > 0 && <BagFilters customers={customers} />}
      <BagRiskList
        bags={visible}
        isFiltered={Boolean(customerId || status) && bags.length > 0}
      />
    </>
  );
}
