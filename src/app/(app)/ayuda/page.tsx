// src/app/(app)/ayuda/page.tsx
// Manuales cortos por rol dentro de la app (AGENTS.md §12 F6) y preguntas frecuentes: abre el manual del rol del
// usuario y deja consultar los demás con ?rol=.
// TRAMPA: con Cache Components, leer la sesión fuera de <Suspense> impide prerenderizar y rompe el build.
import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpFaq } from "@/features/help/components/help-faq";
import { ManualView } from "@/features/help/components/manual-view";
import { chooseManual } from "@/features/help/manual-registry";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Ayuda" };

export default function HelpPage({ searchParams }: PageProps<"/ayuda">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Ayuda"
        description="Qué puedes hacer en Kraken según tu rol y dónde hacerlo."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <HelpContent searchParams={searchParams} />
      </Suspense>
      <HelpFaq />
    </main>
  );
}

async function HelpContent({
  searchParams,
}: Pick<PageProps<"/ayuda">, "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const requested = typeof params.rol === "string" ? params.rol : undefined;
  const choice = chooseManual(
    user.roles.map((role) => role.code),
    requested,
  );
  return <ManualView choice={choice} />;
}
