// src/app/(app)/cv/page.tsx
// Listado de Control de Venta visible para el usuario, con búsqueda, filtro por estado y alta de CV.
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CvListFilters } from "@/features/sales-control/components/cv-list-filters";
import { CvListTable } from "@/features/sales-control/components/cv-list-table";
import { NewCvDialog } from "@/features/sales-control/components/new-cv-dialog";
import { getCvFormOptions } from "@/features/sales-control/queries/get-cv-form-options";
import { listCvs } from "@/features/sales-control/queries/list-cvs";
import type { CvVersionStatus } from "@/generated/prisma/enums";
import { CvVersionStatus as Statuses } from "@/generated/prisma/enums";
import { canCreateCv } from "@/server/authz/cv-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Control de Venta" };

export default function CvListPage({ searchParams }: PageProps<"/cv">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Control de Venta
          </h1>
          <p className="text-sm text-muted-foreground">
            Tus CV y los que puedes ver por tu rol.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-8 w-28" />}>
          <NewCvAction />
        </Suspense>
      </header>
      <Suspense fallback={<Skeleton className="h-9 w-full sm:w-[33rem]" />}>
        <CvListFilters />
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

async function CvListResults({
  searchParams,
}: Pick<PageProps<"/cv">, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const status = toStatus(params.estado);
  const rows = await listCvs(user, { search, status });
  return <CvListTable rows={rows} isFiltered={Boolean(search || status)} />;
}

function toStatus(value: unknown): CvVersionStatus | undefined {
  return typeof value === "string" && value in Statuses
    ? (value as CvVersionStatus)
    : undefined;
}
