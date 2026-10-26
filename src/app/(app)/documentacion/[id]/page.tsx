// src/app/(app)/documentacion/[id]/page.tsx
// Detalle de un proyecto de documentación: su cabecera editable, como la del CV, y una carpeta por fase con sus
// documentos (AGENTS.md §2.10).
// Fuera del alcance del usuario responde 404.
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { DocPhaseSections } from "@/features/documentation/components/doc-phase-sections";
import { DocProjectForm } from "@/features/documentation/components/doc-project-form";
import { getDocProject } from "@/features/documentation/queries/get-doc-project";
import { getDocProjectFormOptions } from "@/features/documentation/queries/get-doc-project-form-options";
import { getDocProjectPhases } from "@/features/documentation/queries/get-doc-project-phases";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Proyecto de documentación" };

export default function DocProjectPage({
  params,
}: PageProps<"/documentacion/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/documentacion"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Documentación
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Project params={params} />
      </Suspense>
    </main>
  );
}

async function Project({
  params,
}: Pick<PageProps<"/documentacion/[id]">, "params">) {
  const user = await requireUser();
  if (!canUseDocumentation(user)) notFound();
  const { id } = await params;
  const [project, options] = await Promise.all([
    getDocProject(user, id),
    getDocProjectFormOptions(),
  ]);
  if (!project) notFound();
  const phases = await getDocProjectPhases(user, project.id);
  const { projectId, ...values } = project.header;
  return (
    <>
      <ModuleHeading
        title={project.name}
        description={[
          project.customerName,
          `Encargado: ${project.ownerName}`,
          ...project.technologies,
        ].join(" · ")}
      />
      <details className="group kr-surface rounded-xl">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <ChevronRight
            className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            aria-hidden="true"
          />
          Cabecera
          <span className="font-normal text-muted-foreground">
            cliente, contacto, tecnologías y encargado
          </span>
        </summary>
        <div className="border-t border-border/60 p-4 sm:p-6">
          <DocProjectForm
            options={options}
            project={{ id: projectId, values }}
          />
        </div>
      </details>
      <DocPhaseSections projectId={project.id} data={phases} />
    </>
  );
}
