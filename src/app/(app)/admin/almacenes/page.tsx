// src/app/(app)/admin/almacenes/page.tsx
// Almacenes: uno físico por ciudad, TRANSITO para los traspasos y, si se usan, demostración y repuestos
// (AGENTS.md §2.8, §5 Administración). Solo para el administrador del sistema.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { WarehousesPanel } from "@/features/inventory/components/warehouses-panel";
import { getWarehousesAdmin } from "@/features/inventory/queries/get-warehouses-admin";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Almacenes" };

export default function WarehousesAdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Almacenes"
        description="Cada ciudad tiene un almacén físico, donde se reservan los CV con stock de DIMA. Los traspasos pasan por el almacén de tránsito."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Warehouses />
      </Suspense>
    </main>
  );
}

async function Warehouses() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const { warehouses, cities } = await getWarehousesAdmin();
  return <WarehousesPanel warehouses={warehouses} cities={cities} />;
}
