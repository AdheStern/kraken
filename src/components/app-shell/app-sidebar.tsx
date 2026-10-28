// src/components/app-shell/app-sidebar.tsx
// Riel de navegación de la app sobre el campo azul DIMA: marca, módulos, TC vigente, ayuda y usuario (DESIGN.md,
// Blue Field Rule).
import { CircleHelp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Props = {
  mark: ReactNode;
  nav: ReactNode;
  fx: ReactNode;
  user: ReactNode;
};

export function AppSidebar({ mark, nav, fx, user }: Props) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* TRAMPA: colapsado, el riel deja 32 px útiles; sin quitar el relleno, la marca se corta. */}
        <div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {mark}
          <div className="leading-none group-data-[collapsible=icon]:hidden">
            <p className="font-display text-xl tracking-[-0.02em]">Kraken</p>
            <p className="mt-0.5 text-[11px] text-sidebar-foreground/70">
              by DIMA
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>{nav}</SidebarContent>
      <SidebarFooter>
        {fx}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/ayuda" />} tooltip="Ayuda">
              <CircleHelp aria-hidden="true" />
              <span>Ayuda</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
