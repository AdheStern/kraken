// src/app/(app)/admin/correo/page.tsx
// Correo saliente (ADR-08, AGENTS.md §7 mail.dispatch): por dónde sale, la cola, los fallidos con reintento y
// el correo de prueba. Solo para el administrador del sistema.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { FailedMailList } from "@/features/admin/components/failed-mail-list";
import { MailOverview } from "@/features/admin/components/mail-overview";
import { TestMailButton } from "@/features/admin/components/test-mail-button";
import { getMailStatus } from "@/features/admin/queries/get-mail-status";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Correo" };

export default function MailPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Correo"
        description="Los avisos se guardan en una cola y el worker los envía con reintentos; ninguno se pierde si el correo falla un rato."
        actions={<TestMailButton />}
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Mail />
      </Suspense>
    </main>
  );
}

async function Mail() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const status = await getMailStatus();
  return (
    <>
      <MailOverview status={status} />
      <section className="grid gap-3" aria-labelledby="fallidos">
        <h2 id="fallidos" className="text-sm font-medium">
          Fallidos
        </h2>
        <FailedMailList failed={status.failed} />
      </section>
    </>
  );
}
