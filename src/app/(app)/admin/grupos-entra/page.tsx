// src/app/(app)/admin/grupos-entra/page.tsx
// Grupos de Entra ID → roles (AGENTS.md ADR-05, §5 Administración): los mapeos, su alta y cómo preparar Entra
// para que el token traiga los grupos. Solo para el administrador del sistema.
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { EntraGroupForm } from "@/features/admin/components/entra-group-form";
import { EntraGroupList } from "@/features/admin/components/entra-group-list";
import { getUserAdminOptions } from "@/features/admin/queries/get-user-admin";
import { listEntraGroups } from "@/features/admin/queries/list-entra-groups";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Grupos de Entra ID" };

const SETUP_STEPS = [
  "En Entra ID → Registros de aplicaciones → Kraken → Configuración de token, agrega la notificación de grupos: «Grupos de seguridad», en el token de id, con formato «Id. de grupo».",
  "Crea un grupo de seguridad por rol y área (por ejemplo KRAKEN-INGENIERO-DIMANET) y agrega a las personas.",
  "Copia el Id. de objeto de cada grupo y mapéalo aquí a su rol y área.",
  "Cada persona recibe o pierde esos roles en su siguiente inicio de sesión con Microsoft.",
];

export default function EntraGroupsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Grupos de Entra ID"
        description="Quien está en un grupo mapeado recibe su rol al iniciar sesión, y lo pierde al salir del grupo. Los roles asignados a mano no cambian."
      />
      <details className="group kr-surface rounded-xl px-5 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium">
          <ChevronRight
            className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            aria-hidden="true"
          />
          Cómo preparar Entra ID
        </summary>
        <ol className="mt-3 grid list-decimal gap-1.5 pl-9 text-sm text-muted-foreground">
          {SETUP_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Groups />
      </Suspense>
    </main>
  );
}

async function Groups() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const [groups, options] = await Promise.all([
    listEntraGroups(),
    getUserAdminOptions(),
  ]);
  return (
    <>
      <EntraGroupForm options={options} />
      <EntraGroupList groups={groups} />
    </>
  );
}
