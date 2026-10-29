// src/app/(app)/cv/[id]/comparar/page.tsx
// Comparador de dos versiones de un CV (`?de=1&a=2`, `&todas=1` muestra también las líneas sin cambios).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VersionComparison } from "@/features/sales-control/components/versions/version-comparison";
import { getCvComparison } from "@/features/sales-control/queries/get-cv-comparison";
import type { SessionUser } from "@/server/authz/roles";
import { requireUser } from "@/server/session";

// POR QUÉ: cache() comparte la comparación entre el título de la pestaña y la página.
// TRAMPA: cache() compara por identidad; las versiones van sueltas y no en un objeto nuevo.
const loadCvComparison = cache(
  (user: SessionUser, id: string, from: number, to: number) =>
    getCvComparison(user, id, { from, to }),
);

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/cv/[id]/comparar">): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const from = Number(query.de);
  const to = Number(query.a);
  const data =
    Number.isInteger(from) && Number.isInteger(to) && from !== to
      ? await loadCvComparison(await requireUser(), id, from, to)
      : null;
  return {
    title: data ? `${data.fromLabel} → ${data.toLabel}` : "Comparar versiones",
  };
}

export default function CvComparePage({
  params,
  searchParams,
}: PageProps<"/cv/[id]/comparar">) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6">
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Comparison params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Comparison({
  params,
  searchParams,
}: PageProps<"/cv/[id]/comparar">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const from = Number(query.de);
  const to = Number(query.a);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to)
    notFound();
  const user = await requireUser();
  const data = await loadCvComparison(user, id, from, to);
  if (!data) notFound();
  const showUnchanged = query.todas === "1";
  const base = `/cv/${id}/comparar?de=${from}&a=${to}`;

  return (
    <>
      <Link
        href={`/cv/${id}?v=${to}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a {data.toLabel}
      </Link>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          {data.fromLabel} → {data.toLabel}
        </h1>
        <Link
          href={showUnchanged ? base : `${base}&todas=1`}
          className="ml-auto text-sm text-primary hover:underline"
        >
          {showUnchanged
            ? "Ocultar líneas sin cambios"
            : "Mostrar también las líneas sin cambios"}
        </Link>
      </header>
      <VersionComparison data={data} showUnchanged={showUnchanged} />
    </>
  );
}
