// src/components/app-shell/app-nav.tsx
// Navegación principal del riel: marca el módulo activo según la ruta.
// TRAMPA: usePathname() en rutas dinámicas exige <Suspense> con Cache Components; el fallback
// muestra los mismos enlaces sin marcar el activo.
"use client";

import { FileSpreadsheet, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const ITEMS = [
  { href: "/inicio", label: "Inicio", icon: House },
  { href: "/cv", label: "Control de Venta", icon: FileSpreadsheet },
] as const;

export function AppNav() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <Suspense fallback={<NavItems activePath={null} />}>
          <ActiveNavItems />
        </Suspense>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ActiveNavItems() {
  return <NavItems activePath={usePathname()} />;
}

function NavItems({ activePath }: { activePath: string | null }) {
  return (
    <SidebarMenu>
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            render={<Link href={href} />}
            isActive={activePath === href || activePath?.startsWith(`${href}/`)}
            tooltip={label}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
