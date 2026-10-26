// src/app/(app)/admin/fases-documentacion/page.tsx
// Catálogo de fases de documentación con su orden, alta, edición y baja lógica (AGENTS.md §2.10, §5).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { DocPhasePanel } from "@/features/documentation/components/phases/doc-phase-panel";
import { listDocPhases } from "@/features/documentation/queries/list-doc-phases";
import { canManageDocPhases } from "@/server/authz/documentation-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Fases de documentación" };

export default function DocPhasesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Fases de documentación"
        description="Cada proyecto de documentación muestra estas fases, en este orden, como carpetas para subir documentos. Una fase dada de baja no admite subidas; sus documentos se siguen viendo."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Phases />
      </Suspense>
    </main>
  );
}

async function Phases() {
  const user = await requireUser();
  if (!canManageDocPhases(user)) notFound();
  return <DocPhasePanel phases={await listDocPhases()} />;
}
