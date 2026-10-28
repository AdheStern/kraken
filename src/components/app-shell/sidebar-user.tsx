// src/components/app-shell/sidebar-user.tsx
// Usuario de la sesión al pie del riel: foto de Microsoft (o iniciales), nombre, correo y la salida.
// Va dentro de un <Suspense>.
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/server/session";
import { PersonAvatar } from "./person-avatar";

export async function SidebarUser() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-2.5 rounded-lg p-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
      <PersonAvatar
        name={user.name}
        image={user.image}
        className="ring-sidebar-border bg-sidebar-accent text-sidebar-foreground"
      />
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-sidebar-foreground/70">
          {user.email}
        </p>
      </div>
      <div className="group-data-[collapsible=icon]:hidden">
        <SignOutButton compact />
      </div>
    </div>
  );
}
