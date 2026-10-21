// src/app/(app)/inventario/traspasos/page.tsx
// Traspasos entre almacenes: primero los que siguen en camino, con lo que falta recibir (AGENTS.md §2.8).
// Solo para quien opera inventario (§2.9).
import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransferList } from "@/features/inventory/components/transfer-list";
import { listTransfers } from "@/features/inventory/queries/list-transfers";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Traspasos" };

export default function TransfersPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Inventario
      </Link>
      <ModuleHeading
        title="Traspasos"
        description="Lo que viaja entre almacenes pasa por tránsito hasta que el destino lo recibe y confirma cantidades y seriales."
        actions={
          <Link href="/inventario/traspasos/nuevo" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            Nuevo traspaso
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Transfers />
      </Suspense>
    </main>
  );
}

async function Transfers() {
  const user = await requireUser();
  if (!canOperateInventory(user)) notFound();
  const rows = await listTransfers(user);
  if (rows.length === 0)
    return (
      <KrakenEmpty title="Todavía no hay traspasos.">
        Crea uno para mover stock entre almacenes; viaja por tránsito hasta que
        el destino lo recibe.
      </KrakenEmpty>
    );
  return <TransferList rows={rows} />;
}
