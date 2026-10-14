// src/app/(app)/layout.tsx
// Shell de la aplicación autenticada: riel azul DIMA con navegación por rol y usuario, barra con avisos y
// tema, y el área de trabajo.
import { Suspense } from "react";
import { AppNav } from "@/components/app-shell/app-nav";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { BASE_NAV } from "@/components/app-shell/nav-entries";
import { RailMark } from "@/components/app-shell/rail-mark";
import { RoleNav } from "@/components/app-shell/role-nav";
import { SidebarUser } from "@/components/app-shell/sidebar-user";
import { KrakenMark } from "@/components/brand/kraken-mark";
import { ModeToggle } from "@/components/theme/mode-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        mark={
          <Suspense fallback={<KrakenMark className="size-9 shrink-0" />}>
            <RailMark />
          </Suspense>
        }
        nav={
          <Suspense fallback={<AppNav entries={BASE_NAV} />}>
            <RoleNav />
          </Suspense>
        }
        user={
          <Suspense
            fallback={<Skeleton className="h-11 w-full bg-sidebar-accent" />}
          >
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset className="kr-ground">
        <header className="kr-header sticky top-0 z-10 flex h-12 items-center gap-2 px-3">
          <SidebarTrigger aria-label="Mostrar u ocultar la navegación" />
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={<Skeleton className="size-8 rounded-md" />}>
              <NotificationBell />
            </Suspense>
            <ModeToggle className="size-8" />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
