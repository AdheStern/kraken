// src/app/(app)/admin/usuarios/page.tsx
// Usuarios del sistema con sus roles, con búsqueda por nombre o correo (AGENTS.md §1 roles, §5 Administración).
// Solo para el administrador del sistema (§2.9).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { AdminSearch } from "@/features/admin/components/admin-search";
import { UserTable } from "@/features/admin/components/user-table";
import { listUsers } from "@/features/admin/queries/list-users";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Usuarios y roles" };

export default function UsersPage({
  searchParams,
}: PageProps<"/admin/usuarios">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Usuarios y roles"
        description="Cada persona aparece al entrar por primera vez con su cuenta de Microsoft. Sus roles deciden qué ve; los permisos de varios roles se suman."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Users searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Users({
  searchParams,
}: Pick<PageProps<"/admin/usuarios">, "searchParams">) {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const users = await listUsers(search);
  return (
    <>
      <AdminSearch
        action="/admin/usuarios"
        defaultValue={search}
        placeholder="Buscar por nombre o correo"
      />
      <UserTable users={users} search={search} />
    </>
  );
}
