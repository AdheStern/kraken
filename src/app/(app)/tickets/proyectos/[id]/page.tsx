// src/app/(app)/tickets/proyectos/[id]/page.tsx
// Detalle de un proyecto: cabecera, alta de ticket prellenada con su cliente, áreas y bolsa, y pestañas de
// resumen, tickets y bolsas que sus tickets pueden usar (AGENTS.md §2.6, §2.4, §5). Fuera del alcance responde 404.
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { EngineerWeekChart } from "@/features/dashboards/components/engineer-week-chart";
import { BagCard } from "@/features/hours/components/bag-card";
import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import { ProjectHeader } from "@/features/tickets/components/project-header";
import { ProjectSummaryPanel } from "@/features/tickets/components/project-summary-panel";
import { ProjectTicketAction } from "@/features/tickets/components/project-ticket-action";
import { TicketBoard } from "@/features/tickets/components/ticket-board";
import { getProjectDetail } from "@/features/tickets/queries/get-project-detail";
import { getProjectSummary } from "@/features/tickets/queries/get-project-summary";
import { getTicketFormOptions } from "@/features/tickets/queries/get-ticket-form-options";
import { listTickets } from "@/features/tickets/queries/list-tickets";
import type { ProjectDetailView } from "@/features/tickets/types";
import { requireUser } from "@/server/session";

const TABS = ["resumen", "tickets", "bolsas"] as const;

// POR QUÉ: cache() comparte la lectura entre el título de la pestaña y la página.
const loadProject = cache(async (id: string) =>
  getProjectDetail(await requireUser(), id),
);

export async function generateMetadata({
  params,
}: PageProps<"/tickets/proyectos/[id]">): Promise<Metadata> {
  const project = await loadProject((await params).id);
  return { title: project?.name ?? "Proyecto" };
}

export default function ProjectPage({
  params,
  searchParams,
}: PageProps<"/tickets/proyectos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/tickets/proyectos"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Proyectos
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Project params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Project({
  params,
  searchParams,
}: PageProps<"/tickets/proyectos/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const project = await loadProject(id);
  if (!project) notFound();
  const tab = TABS.find((t) => t === query.pestana) ?? "resumen";
  return (
    <>
      <ProjectHeader
        project={project}
        tab={tab}
        action={
          project.canManage && project.status === "ACTIVO" ? (
            <NewTicket project={project} />
          ) : null
        }
      />
      {tab === "resumen" && <ProjectSummary project={project} />}
      {tab === "tickets" && <ProjectTickets project={project} />}
      {tab === "bolsas" && <ProjectBags project={project} />}
    </>
  );
}

async function ProjectSummary({ project }: { project: ProjectDetailView }) {
  const summary = await getProjectSummary(await requireUser(), project.id);
  return (
    <ProjectSummaryPanel
      summary={summary}
      weekChart={<EngineerWeekChart weeks={summary.weeks} />}
    />
  );
}

async function NewTicket({ project }: { project: ProjectDetailView }) {
  const options = await getTicketFormOptions(await requireUser());
  return <ProjectTicketAction project={project} options={options} />;
}

async function ProjectTickets({ project }: { project: ProjectDetailView }) {
  const user = await requireUser();
  const tickets = await listTickets(user, { projectId: project.id });
  return <TicketBoard tickets={tickets} isFiltered={false} />;
}

async function ProjectBags({ project }: { project: ProjectDetailView }) {
  const user = await requireUser();
  const bags = await listHourBags(user, { project });
  if (bags.length === 0)
    return (
      <KrakenEmpty title="Este proyecto no tiene bolsas que pueda usar">
        Las bolsas nacen al aprobar un CV con horas de servicio para el
        proyecto, para sus áreas o generales del cliente.
      </KrakenEmpty>
    );
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bags.map((bag) => (
        <BagCard key={bag.id} bag={bag} />
      ))}
    </ul>
  );
}
