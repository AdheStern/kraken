// src/app/(app)/admin/page.tsx
// Entrada de la administración (AGENTS.md §5): las secciones que el usuario gestiona, agrupadas, con sus conteos.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_GROUPS } from "@/features/admin/admin-sections";
import { AdminSectionCard } from "@/features/admin/components/admin-section-card";
import { getAdminOverview } from "@/features/admin/queries/get-admin-overview";
import {
  canManageCommercialCatalogs,
  canManageSystem,
  canOpenAdmin,
} from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Administración" };

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Administración"
        description="Catálogos, usuarios y parámetros. Lo que cambies aquí rige desde ese momento, sin desplegar."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AdminSections />
      </Suspense>
    </main>
  );
}

async function AdminSections() {
  const user = await requireUser();
  if (!canOpenAdmin(user)) notFound();
  const access = {
    system: canManageSystem(user),
    commercial: canManageCommercialCatalogs(user),
  };
  const counts = await getAdminOverview();
  const groups = ADMIN_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((s) => access[s.access]),
  })).filter((group) => group.sections.length > 0);
  return groups.map((group) => (
    <section key={group.title} className="grid gap-3">
      <h2 className="text-sm font-medium">{group.title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.sections.map((section) => (
          <AdminSectionCard
            key={section.key}
            section={section}
            count={counts[section.key]}
          />
        ))}
      </ul>
    </section>
  ));
}
