// src/app/(app)/tickets/carga-historica/page.tsx
// Carga histórica de trabajo previo a Kraken en una grilla tipo planilla; desde un proyecto, las filas nuevas
// traen su cliente, su proyecto y su área (AGENTS.md §2.6, decisión 2026-11-19). Solo para quienes crean tickets.
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoricalLoadEditor } from "@/features/tickets/components/historical/historical-load-editor";
import { getProjectDetail } from "@/features/tickets/queries/get-project-detail";
import { getTicketFormOptions } from "@/features/tickets/queries/get-ticket-form-options";
import { canCreateAnyTicket } from "@/server/authz/ticket-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Carga histórica" };

export default function HistoricalLoadPage({
  searchParams,
}: PageProps<"/tickets/carga-historica">) {
  return (
    <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/tickets"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tickets
      </Link>
      <ModuleHeading
        title="Carga histórica"
        description="Pega o escribe el trabajo hecho antes de Kraken: una fila por tramo; las filas con la misma referencia son un ticket. Los cerrados descuentan de su bolsa como un cierre normal y repetir una referencia no la duplica."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Editor({
  searchParams,
}: Pick<PageProps<"/tickets/carga-historica">, "searchParams">) {
  const user = await requireUser();
  if (!canCreateAnyTicket(user)) notFound();
  const { proyecto } = await searchParams;
  const [options, project] = await Promise.all([
    getTicketFormOptions(user),
    typeof proyecto === "string" ? getProjectDetail(user, proyecto) : null,
  ]);
  const managed = new Set(options.areas.map((a) => a.id));
  const areaIds = project?.areaIds.filter((id) => managed.has(id)) ?? [];
  return (
    <HistoricalLoadEditor
      options={options}
      defaults={
        project
          ? {
              customerId: project.customerId,
              projectId: project.id,
              areaIds: areaIds.slice(0, 1),
            }
          : {}
      }
    />
  );
}
