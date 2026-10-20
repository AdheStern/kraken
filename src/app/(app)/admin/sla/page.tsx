// src/app/(app)/admin/sla/page.tsx
// Políticas de SLA por modalidad y prioridad: tiempo de primera respuesta y de resolución (AGENTS.md §2.7,
// §5 Administración). Solo para el administrador del sistema.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { SlaPolicyRow } from "@/features/sla/components/sla-policy-row";
import { getSlaPolicies } from "@/features/sla/queries/get-sla-policies";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Políticas de SLA" };

const MODALITY_TITLES = {
  H8X5: "8x5 · horas de oficina de la ciudad del ticket",
  H24X7: "24x7 · todas las horas",
} as const;

export default function SlaAdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Políticas de SLA"
        description="Tiempo comprometido de primera respuesta y de resolución. El reloj se pausa mientras el ticket espera al cliente; en 8x5 cuenta solo el horario de la ciudad del ticket."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <SlaPolicies />
      </Suspense>
    </main>
  );
}

async function SlaPolicies() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const rows = await getSlaPolicies();
  return (
    <>
      {(["H8X5", "H24X7"] as const).map((modality) => (
        <section
          key={modality}
          className="grid gap-3"
          aria-labelledby={`sla-${modality}`}
        >
          <h2 id={`sla-${modality}`} className="text-sm font-medium">
            {MODALITY_TITLES[modality]}
          </h2>
          <ul className="kr-solid divide-y divide-border/60 rounded-xl">
            {rows
              .filter((r) => r.modality === modality)
              .map((row) => (
                <SlaPolicyRow
                  key={`${row.modality}-${row.priority}`}
                  row={row}
                />
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
