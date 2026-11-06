// src/app/(app)/clientes/contactos/[id]/page.tsx
// Ficha de una persona de contacto: su puesto actual y su historial de empresas (decisión 2026-11-06).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonHistory } from "@/features/customers/components/person-history";
import { getContactPerson } from "@/features/customers/queries/get-contact-person";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPersonPage({
  params,
}: PageProps<"/clientes/contactos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/clientes/contactos"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Contactos
      </Link>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Person params={params} />
      </Suspense>
    </main>
  );
}

async function Person({
  params,
}: Pick<PageProps<"/clientes/contactos/[id]">, "params">) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const person = z.uuid().safeParse(id).success
    ? await getContactPerson(user, id)
    : null;
  if (!person) notFound();
  const current = person.positions.find((p) => p.isActive);
  const personal = [person.personalEmail, person.personalPhone]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <ModuleHeading
        title={person.name}
        description={
          current
            ? `${current.position ?? "Contacto"} en ${current.customerName}`
            : "Hoy no trabaja en ningún cliente registrado."
        }
      />
      {personal && (
        <p className="text-sm text-muted-foreground">
          Datos personales: {personal}
        </p>
      )}
      <section
        className="kr-solid grid gap-3 rounded-xl p-5"
        aria-labelledby="historial"
      >
        <h2 id="historial" className="text-sm font-medium">
          Historial de empresas
        </h2>
        <PersonHistory
          person={person}
          canManage={canManageCommercialCatalogs(user)}
        />
      </section>
    </>
  );
}
