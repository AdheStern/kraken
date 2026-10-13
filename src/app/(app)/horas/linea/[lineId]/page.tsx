// src/app/(app)/horas/linea/[lineId]/page.tsx
// Abre la bolsa de una línea de CV ("Ver bolsa" en el detalle de línea); si aún no existe, explica cuándo se crea.
import { ArrowLeft, Hourglass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { findLineBagId } from "@/features/hours/queries/find-line-bag";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Bolsa de la línea" };

export default function LineBagPage({
  params,
}: PageProps<"/horas/linea/[lineId]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <LineBag params={params} />
      </Suspense>
    </main>
  );
}

async function LineBag({
  params,
}: Pick<PageProps<"/horas/linea/[lineId]">, "params">) {
  const { lineId } = await params;
  const user = await requireUser();
  const bagId = await findLineBagId(user, lineId);
  if (bagId) redirect(`/horas/${bagId}`);
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
      <Hourglass className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">Esta línea todavía no tiene bolsa.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        La bolsa se crea cuando se aprueba la versión del CV. Si ya está
        aprobada, pide acceso a tu gerente de área.
      </p>
      <Link
        href="/horas"
        className="mt-2 flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Bolsas de horas
      </Link>
    </div>
  );
}
