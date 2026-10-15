// src/app/(app)/admin/auditoria/page.tsx
// Visor de auditoría (ADR-14, AGENTS.md §5 Administración): quién cambió qué y cuándo, con filtros y páginas
// de 50. Solo para el administrador del sistema; los montos se ocultan salvo al GG (§2.9).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { AuditEventList } from "@/features/admin/components/audit-event-list";
import { AuditFilters } from "@/features/admin/components/audit-filters";
import { listAuditEvents } from "@/features/admin/queries/list-audit-events";
import type { AuditFilters as Filters } from "@/features/admin/types";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { hasRole } from "@/server/authz/roles";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Auditoría" };

export default function AuditPage({
  searchParams,
}: PageProps<"/admin/auditoria">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Auditoría"
        description="Cada decisión queda registrada con quién la tomó, cuándo y qué cambió. Nada de esto se puede editar ni borrar."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Audit({
  searchParams,
}: Pick<PageProps<"/admin/auditoria">, "searchParams">) {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const params = await searchParams;
  const text = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value ? value : undefined;
  };
  const date = (key: string) => {
    const value = text(key);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  };
  const filters: Filters = {
    entity: text("entidad"),
    from: date("desde"),
    to: date("hasta"),
    cursor: text("despues"),
  };
  const { events, nextCursor } = await listAuditEvents(
    filters,
    hasRole(user, "GERENTE_GENERAL"),
  );
  const next = new URLSearchParams(
    Object.entries({
      entidad: filters.entity,
      desde: filters.from,
      hasta: filters.to,
    }).filter((entry): entry is [string, string] => !!entry[1]),
  );
  if (nextCursor) next.set("despues", nextCursor);
  return (
    <>
      <AuditFilters filters={filters} />
      <AuditEventList
        events={events}
        isFiltered={!!(filters.entity || filters.from || filters.to)}
      />
      <div className="flex justify-between gap-3">
        {filters.cursor && (
          <Link
            href="/admin/auditoria"
            className={buttonVariants({ variant: "outline" })}
          >
            Volver a lo más reciente
          </Link>
        )}
        {nextCursor && (
          <Link
            href={`/admin/auditoria?${next.toString()}`}
            className={`${buttonVariants({ variant: "outline" })} ml-auto`}
          >
            Ver más antiguos
          </Link>
        )}
      </div>
    </>
  );
}
