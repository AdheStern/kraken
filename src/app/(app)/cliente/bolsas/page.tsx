// src/app/(app)/cliente/bolsas/page.tsx
// Bolsas de horas de la empresa en el portal de clientes, si su configuración lo permite (AGENTS.md §2.11).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { BagCard } from "@/features/hours/components/bag-card";
import { listCustomerBags } from "@/features/hours/queries/list-customer-bags";
import { canSeeCustomerBags } from "@/server/authz/scope-customer-hour-bag-query";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Bolsas de horas" };

export default function CustomerBagsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Bolsas de horas"
        description="Las horas que contrataste con DIMA: saldo, consumo y vencimiento. Cada ticket cerrado descuenta de aquí."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Bags />
      </Suspense>
    </main>
  );
}

async function Bags() {
  const user = await requireUser();
  if (!canSeeCustomerBags(user)) notFound();
  const bags = await listCustomerBags(user);
  if (bags.length === 0)
    return (
      <p className="kr-surface rounded-xl px-4 py-6 text-sm text-muted-foreground">
        Tu empresa todavía no tiene bolsas de horas con DIMA. Aparecen aquí
        cuando se aprueba un contrato de horas o de soporte.
      </p>
    );
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bags.map((bag) => (
        <BagCard key={bag.id} bag={bag} forCustomer />
      ))}
    </ul>
  );
}
