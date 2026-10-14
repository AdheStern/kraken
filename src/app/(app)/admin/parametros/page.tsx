// src/app/(app)/admin/parametros/page.tsx
// Parámetros del sistema editables sin desplegar (AGENTS.md §0.16, §5 Administración). Solo para el
// administrador del sistema (§2.9).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { ParameterCard } from "@/features/admin/components/parameter-card";
import { listParameters } from "@/features/admin/queries/list-parameters";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Parámetros" };

export default function ParametersPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Parámetros"
        description="Reglas que DIMA puede ajustar sin una versión nueva del sistema. Cada cambio rige desde que lo guardas."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Parameters />
      </Suspense>
    </main>
  );
}

async function Parameters() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const parameters = await listParameters();
  return (
    <ul className="grid gap-3">
      {parameters.map((p) => (
        <ParameterCard key={`${p.key}-${p.text}`} parameter={p} />
      ))}
    </ul>
  );
}
