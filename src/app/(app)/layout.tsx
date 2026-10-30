// src/app/(app)/layout.tsx
// Shell de la aplicación autenticada: riel azul DIMA con navegación por rol y usuario, barra con el contador
// abierto, avisos y tema, y el área de trabajo.
import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/app-shell/app-nav";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { BASE_NAV } from "@/components/app-shell/nav-entries";
import { RailMark } from "@/components/app-shell/rail-mark";
import { RoleNav } from "@/components/app-shell/role-nav";
import { SidebarFx } from "@/components/app-shell/sidebar-fx";
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
import { HeaderTimer } from "@/features/tickets/components/header-timer";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        mark={
          <Suspense
            fallback={
              <KrakenMark className="size-9 shrink-0 group-data-[collapsible=icon]:size-8" />
            }
          >
            <RailMark />
          </Suspense>
        }
        nav={
          <Suspense fallback={<AppNav entries={BASE_NAV} />}>
            <RoleNav />
          </Suspense>
        }
        fx={
          <Suspense fallback={null}>
            <SidebarFx />
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
      {/* TRAMPA: sin min-w-0 el área de contenido crece con lo más ancho (tablero, grilla) y la página desborda. */}
      <SidebarInset className="kr-ground min-w-0">
        {/* POR QUÉ: z-30 deja la cabecera sobre lo fijo del contenido (encabezado de la grilla, temporizador, menús
            de tarjetas, z-10) al desplazar, y bajo diálogos, paneles y menús emergentes (z-50). */}
        <header className="kr-header sticky top-0 z-30 flex h-12 items-center gap-2 px-3">
          <SidebarTrigger aria-label="Mostrar u ocultar la navegación" />
          {/* POR QUÉ: en móvil el riel vive en un panel; la cabecera lleva la marca para no perder identidad. */}
          <Link href="/inicio" className="flex items-center gap-1.5 md:hidden">
            <KrakenMark className="size-6" />
            <span className="font-display text-lg tracking-[-0.02em]">
              Kraken
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={null}>
              <HeaderTimer />
            </Suspense>
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
