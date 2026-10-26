// src/app/(app)/documentacion/page.tsx
// Proyectos de documentación con búsqueda por nombre o cliente (AGENTS.md §2.10, §5 navegación).
// Pública para todo usuario con rol.
import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DocProjectList } from "@/features/documentation/components/doc-project-list";
import { listDocProjects } from "@/features/documentation/queries/list-doc-projects";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Documentación" };

export default function DocumentationPage({
  searchParams,
}: PageProps<"/documentacion">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Documentación"
        description="Los documentos de cada proyecto, ordenados por fase. Todos pueden verlos y subirlos; se guardan en SharePoint."
        actions={
          <Link href="/documentacion/nuevo" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            Nuevo proyecto
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Projects searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Projects({
  searchParams,
}: Pick<PageProps<"/documentacion">, "searchParams">) {
  const user = await requireUser();
  if (!canUseDocumentation(user)) notFound();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  return (
    <>
      <search className="relative w-full max-w-md">
        <form action="/documentacion">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por proyecto o cliente"
            aria-label="Buscar por proyecto o cliente"
            className="h-9 pl-9"
          />
        </form>
      </search>
      <DocProjectList
        projects={await listDocProjects(user, search)}
        search={search}
      />
    </>
  );
}
