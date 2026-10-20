// src/app/(app)/tickets/proyectos/page.tsx
// Proyectos: contenedores de tickets con su cliente, áreas y fechas; alta, cierre y enlace al tablero filtrado
// (AGENTS.md §2.6, §5 navegación "proyectos").
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { NewProjectDialog } from "@/features/tickets/components/new-project-dialog";
import { ProjectList } from "@/features/tickets/components/project-list";
import { getTicketFormOptions } from "@/features/tickets/queries/get-ticket-form-options";
import { listProjects } from "@/features/tickets/queries/list-projects";
import {
  canCreateAnyTicket,
  canSeeTickets,
} from "@/server/authz/ticket-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Proyectos" };

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/tickets"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tickets
      </Link>
      <ModuleHeading
        title="Proyectos"
        description="Agrupan los tickets de una implementación; sus bolsas de horas solo las usan los tickets del proyecto."
        actions={
          <Suspense fallback={null}>
            <NewProjectAction />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Projects />
      </Suspense>
    </main>
  );
}

async function NewProjectAction() {
  const user = await requireUser();
  if (!canCreateAnyTicket(user)) return null;
  return <NewProjectDialog options={await getTicketFormOptions(user)} />;
}

async function Projects() {
  const user = await requireUser();
  if (!canSeeTickets(user)) notFound();
  return <ProjectList projects={await listProjects(user)} />;
}
