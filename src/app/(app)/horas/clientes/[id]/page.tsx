// src/app/(app)/horas/clientes/[id]/page.tsx
// Bolsas de un cliente en tarjetas con anillo de consumo, modalidad, alcance y vencimiento (AGENTS.md §5).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NodeMark } from "@/components/app-shell/node-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { BagCard } from "@/features/hours/components/bag-card";
import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Bolsas del cliente" };

export default function CustomerBagsPage({
  params,
}: PageProps<"/horas/clientes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/horas"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Bolsas de horas
      </Link>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <CustomerBags params={params} />
      </Suspense>
    </main>
  );
}

async function CustomerBags({
  params,
}: Pick<PageProps<"/horas/clientes/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const bags = await listHourBags(user, { customerId: id });
  // POR QUÉ: un cliente sin bolsas visibles para este usuario se trata como inexistente (regla 7).
  if (bags.length === 0) notFound();
  const active = bags.filter((b) => b.status === "ACTIVA").length;
  return (
    <>
      <header className="flex items-start gap-3">
        <NodeMark className="mt-2" />
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {bags[0].customerName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bags.length === 1 ? "1 bolsa" : `${bags.length} bolsas`} ·{" "}
            {active === 1 ? "1 activa" : `${active} activas`}
          </p>
        </div>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bags.map((bag) => (
          <BagCard key={bag.id} bag={bag} />
        ))}
      </ul>
    </>
  );
}
