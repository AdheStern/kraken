// src/components/app-shell/sidebar-user.tsx
// Usuario de la sesión al pie del riel, con su rol principal y la salida. Va dentro de un <Suspense>.
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/server/session";

export async function SidebarUser() {
  const user = await requireUser();
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-2.5 rounded-lg p-1.5 group-data-[collapsible=icon]:justify-center">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold"
      >
        {initials}
      </span>
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
