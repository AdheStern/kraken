// src/app/(app)/documentacion/nuevo/page.tsx
// Alta de un proyecto de documentación con su cabecera; al crear abre su detalle (AGENTS.md §2.10).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { FreshAfterCreate } from "@/components/forms/fresh-after-create";
import { Skeleton } from "@/components/ui/skeleton";
import { DocProjectForm } from "@/features/documentation/components/doc-project-form";
import { getDocProjectFormOptions } from "@/features/documentation/queries/get-doc-project-form-options";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Nuevo proyecto de documentación" };

export default function NewDocProjectPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/documentacion"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Documentación
      </Link>
      <ModuleHeading
        title="Nuevo proyecto"
        description="Completa la cabecera; después subes los documentos de cada fase."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <NewProject />
      </Suspense>
    </main>
  );
}

async function NewProject() {
  const user = await requireUser();
  if (!canUseDocumentation(user)) notFound();
  return (
    <section className="kr-surface rounded-xl p-4 sm:p-6">
      <FreshAfterCreate>
        <DocProjectForm options={await getDocProjectFormOptions()} />
      </FreshAfterCreate>
    </section>
  );
}
