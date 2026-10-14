// src/app/(app)/horas/[bagId]/page.tsx
// Libro de una bolsa: anillo y cifras, atributos, acciones del gerente y cada movimiento con su saldo
// (AGENTS.md §2.4 libro mayor, §5 "el libro enlaza al ticket que originó cada movimiento").
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjustBagDialog } from "@/features/hours/components/adjust-bag-dialog";
import { BagFacts } from "@/features/hours/components/bag-facts";
import {
  MODALITY_LABELS,
  scopeText,
} from "@/features/hours/components/bag-labels";
import { BagLedgerTable } from "@/features/hours/components/bag-ledger-table";
import { BagStatusBadge } from "@/features/hours/components/bag-status-badge";
import { CloseBagDialog } from "@/features/hours/components/close-bag-dialog";
import {
  bagTone,
  HourBagRing,
} from "@/features/hours/components/hour-bag-ring";
import { getHourBag } from "@/features/hours/queries/get-hour-bag";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Libro de la bolsa" };

export default function HourBagPage({ params }: PageProps<"/horas/[bagId]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/horas"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Bolsas de horas
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <HourBag params={params} />
      </Suspense>
    </main>
  );
}

async function HourBag({
  params,
}: Pick<PageProps<"/horas/[bagId]">, "params">) {
  const { bagId } = await params;
  const user = await requireUser();
  const detail = await getHourBag(user, bagId);
  if (!detail) notFound();
  const { bag, ledger } = detail;
  // REGLA: solo el gerente del área o el GG ajustan o cierran, y solo bolsas no terminales (§2.9, §8).
  const canChange =
    detail.canAdjust && (bag.status === "ACTIVA" || bag.status === "AGOTADA");
  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <div className="relative grid size-[76px] shrink-0 place-items-center">
          <HourBagRing
            pct={bag.consumedPct}
            status={bag.status}
            tone={bagTone(bag)}
            size="lg"
            className="absolute inset-0"
          />
          <span className="text-lg font-semibold tabular-nums">
            {bag.consumedPct}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              {bag.cvLabel}
            </h1>
            <BagStatusBadge status={bag.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {bag.lineDescription} · {MODALITY_LABELS[bag.modality]} ·{" "}
            {scopeText(bag)}
          </p>
          <p className="text-sm">
            <Link
              href={`/horas/clientes/${bag.customerId}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {bag.customerName}
            </Link>
            <span className="text-muted-foreground"> · </span>
            <Link
              href={`/cv/${bag.cvId}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Ver CV
            </Link>
          </p>
        </div>
        {canChange && (
          <div className="flex items-center gap-1">
            <AdjustBagDialog
              bagId={bag.id}
              balanceMinutes={bag.balanceMinutes}
            />
            <CloseBagDialog
              bagId={bag.id}
              balanceMinutes={bag.balanceMinutes}
            />
          </div>
        )}
      </header>
      <BagFacts bag={bag} />
      <section className="flex flex-col gap-2.5" aria-labelledby="libro">
        <h2 id="libro" className="text-sm font-medium">
          Libro mayor{" "}
          <span className="text-muted-foreground">({ledger.length})</span>
        </h2>
        <BagLedgerTable entries={ledger} />
      </section>
    </>
  );
}
