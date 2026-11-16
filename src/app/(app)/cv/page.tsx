// src/app/(app)/cv/page.tsx
// Listado de Control de Venta visible para el usuario, con búsqueda, filtros, orden, paginación y alta de CV.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { CvListFilters } from "@/features/sales-control/components/cv-list-filters";
import { CvListTable } from "@/features/sales-control/components/cv-list-table";
import { NewCvDialog } from "@/features/sales-control/components/new-cv-dialog";
import { getCvFormOptions } from "@/features/sales-control/queries/get-cv-form-options";
import { getCvListFilterOptions } from "@/features/sales-control/queries/get-cv-list-filter-options";
import { listCvPage } from "@/features/sales-control/queries/list-cv-page";
import { parseCvListParams } from "@/features/sales-control/schemas/cv-list-params";
import { canCreateCv, canListCvs } from "@/server/authz/cv-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Control de Venta" };

export default function CvListPage({ searchParams }: PageProps<"/cv">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Control de Venta"
        tour="cv-lista"
        description="Tus CV y los que puedes ver por tu rol."
        actions={
          <Suspense fallback={<Skeleton className="h-8 w-28" />}>
            <NewCvAction />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <CvListFilterBar />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <CvListResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewCvAction() {
  const user = await requireUser();
  if (!canCreateCv(user)) return null;
  const { cities, customers } = await getCvFormOptions();
  return <NewCvDialog options={{ cities, customers }} />;
}

async function CvListFilterBar() {
  const user = await requireUser();
  if (!canListCvs(user)) return null;
  return <CvListFilters options={await getCvListFilterOptions()} />;
}

async function CvListResults({
  searchParams,
}: Pick<PageProps<"/cv">, "searchParams">) {
  const user = await requireUser();
  if (!canListCvs(user)) notFound();
  const raw = await searchParams;
  const params = parseCvListParams(raw);
  const page = await listCvPage(user, params);
  const query = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
  const isFiltered = Boolean(
    params.search || params.status || params.cityId || params.areaId,
  );
  return (
    <CvListTable
      page={page}
      sort={params.sort}
      query={query}
      isFiltered={isFiltered}
    />
  );
}
