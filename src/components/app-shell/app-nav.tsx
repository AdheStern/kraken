// src/components/app-shell/app-nav.tsx
// Navegación principal del riel: los módulos que el servidor habilita para el rol, con su contador, y el
// módulo activo según la ruta.
// TRAMPA: usePathname() en rutas dinámicas exige <Suspense> con Cache Components; el fallback
// muestra los mismos enlaces sin marcar el activo.
"use client";

import { FileSpreadsheet, House, type LucideIcon, Stamp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavEntry, NavKey } from "./nav-entries";

const ITEMS: Record<NavKey, { href: string; label: string; icon: LucideIcon }> =
  {
    inicio: { href: "/inicio", label: "Inicio", icon: House },
    cv: { href: "/cv", label: "Control de Venta", icon: FileSpreadsheet },
    aprobaciones: { href: "/aprobaciones", label: "Aprobaciones", icon: Stamp },
  };

export function AppNav({ entries }: { entries: readonly NavEntry[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <Suspense fallback={<NavItems entries={entries} activePath={null} />}>
          <ActiveNavItems entries={entries} />
        </Suspense>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ActiveNavItems({ entries }: { entries: readonly NavEntry[] }) {
  return <NavItems entries={entries} activePath={usePathname()} />;
}

type NavItemsProps = {
  entries: readonly NavEntry[];
  activePath: string | null;
};

function NavItems({ entries, activePath }: NavItemsProps) {
  return (
    <SidebarMenu>
      {entries.map(({ key, badge }) => {
        const { href, label, icon: Icon } = ITEMS[key];
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              render={<Link href={href} />}
              isActive={
                activePath === href || activePath?.startsWith(`${href}/`)
              }
              tooltip={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </SidebarMenuButton>
            {badge ? (
              <SidebarMenuBadge aria-label={`${badge} pendientes`}>
                {badge}
              </SidebarMenuBadge>
            ) : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
