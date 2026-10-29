// src/app/(app)/admin/usuarios/[id]/page.tsx
// Ficha de un usuario: ciudad, cargo, estado y roles con su área (AGENTS.md §1 roles, §2.9).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { UserProfileForm } from "@/features/admin/components/user-profile-form";
import { UserRolesPanel } from "@/features/admin/components/user-roles-panel";
import { UserStatusButton } from "@/features/admin/components/user-status-button";
import {
  getUserAdmin,
  getUserAdminOptions,
} from "@/features/admin/queries/get-user-admin";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

// POR QUÉ: cache() comparte la lectura entre el título de la pestaña y la página.
const loadUserAdmin = cache(async (id: string) => {
  const viewer = await requireUser();
  if (!canManageSystem(viewer)) return null;
  return getUserAdmin(decodeURIComponent(id), viewer.id);
});

export async function generateMetadata({
  params,
}: PageProps<"/admin/usuarios/[id]">): Promise<Metadata> {
  const user = await loadUserAdmin((await params).id);
  return { title: user?.name ?? "Usuario" };
}

export default function UserPage({
  params,
}: PageProps<"/admin/usuarios/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink href="/admin/usuarios" label="Usuarios y roles" />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <User params={params} />
      </Suspense>
    </main>
  );
}

async function User({
  params,
}: Pick<PageProps<"/admin/usuarios/[id]">, "params">) {
  const { id } = await params;
  const [user, options] = await Promise.all([
    loadUserAdmin(id),
    getUserAdminOptions(),
  ]);
  if (!user) notFound();
  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <PersonAvatar
          name={user.name}
          image={user.image}
          className="size-14 text-lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] break-words">
            {user.name}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {user.email}
            {!user.isActive && " · Dado de baja: no puede entrar"}
          </p>
        </div>
        <UserStatusButton
          userId={user.id}
          isActive={user.isActive}
          isSelf={user.isSelf}
        />
      </header>
      <section className="grid gap-3" aria-labelledby="perfil">
        <h2 id="perfil" className="text-sm font-medium">
          Perfil
        </h2>
        <UserProfileForm key={user.id} user={user} cities={options.cities} />
      </section>
      <section className="grid gap-3" aria-labelledby="roles">
        <h2 id="roles" className="text-sm font-medium">
          Roles
        </h2>
        <UserRolesPanel user={user} options={options} />
      </section>
    </>
  );
}
