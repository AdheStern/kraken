// src/components/app-shell/app-sidebar.tsx
// Riel de navegación de la app sobre el campo azul DIMA: marca, módulos y usuario (DESIGN.md, Blue Field Rule).
import type { ReactNode } from "react";
import { KrakenMark } from "@/components/brand/kraken-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AppNav } from "./app-nav";

export function AppSidebar({ user }: { user: ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <KrakenMark className="size-8 shrink-0" />
          <div className="leading-none group-data-[collapsible=icon]:hidden">
            <p className="font-display text-xl tracking-[-0.02em]">Kraken</p>
            <p className="mt-0.5 text-[11px] text-sidebar-foreground/70">
              by DIMA
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <AppNav />
      </SidebarContent>
      <SidebarFooter>{user}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
