// src/app/(app)/inventario/ajustes/page.tsx
// Ajustes de inventario: primero los pendientes, con su decisión para quien corresponde (gerente del área,
// Administración o GG), y los decididos recientes (AGENTS.md §2.8, §2.9).
import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjustmentRequestList } from "@/features/inventory/components/adjustment-request-list";
import { listAdjustmentRequests } from "@/features/inventory/queries/list-adjustment-requests";
import {
  canDecideAdjustments,
  canOperateInventory,
} from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Ajustes de inventario" };

export default function AdjustmentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Inventario
      </Link>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Adjustments />
      </Suspense>
    </main>
  );
}

async function Adjustments() {
  const user = await requireUser();
  const canOperate = canOperateInventory(user);
  if (!canOperate && !canDecideAdjustments(user)) notFound();
  const rows = await listAdjustmentRequests(user);
  return (
    <>
      <ModuleHeading
        title="Ajustes de inventario"
        description="Una diferencia entra al kardex solo cuando la aprueba el gerente de su área, Administración o el GG; quien la pide no la decide."
        actions={
          canOperate && (
            <Link href="/inventario/ajustes/nuevo" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              Nuevo ajuste
            </Link>
          )
        }
      />
      {rows.length > 0 ? (
        <AdjustmentRequestList rows={rows} />
      ) : (
        <KrakenEmpty title="No hay ajustes por ahora.">
          Las diferencias de un conteo, de un traspaso o las que se piden a mano
          aparecen aquí para su aprobación.
        </KrakenEmpty>
      )}
    </>
  );
}
