// src/components/app-shell/app-nav.tsx
// Navegación principal del riel como la red del isotipo DIMA: cada módulo es un nodo hueco unido por un trazo, y
// el nodo activo viaja por la red al cambiar de módulo (firma de la app, DESIGN.md). Con su contador por rol.
// TRAMPA: usePathname() en rutas dinámicas exige <Suspense> con Cache Components; el fallback
// muestra los mismos enlaces sin marcar el activo.
"use client";

import {
  FileSpreadsheet,
  Hourglass,
  House,
  type LucideIcon,
  Settings,
  Stamp,
} from "lucide-react";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
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
    horas: { href: "/horas", label: "Bolsas de horas", icon: Hourglass },
    aprobaciones: { href: "/aprobaciones", label: "Aprobaciones", icon: Stamp },
    admin: {
      href: "/admin",
      label: "Administración",
      icon: Settings,
    },
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
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="kr-nav">
        <SidebarMenu className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 bottom-4 left-[15px] w-0.5 rounded-full bg-white/25 group-data-[collapsible=icon]:hidden"
          />
          {entries.map(({ key, badge }) => {
            const { href, label, icon: Icon } = ITEMS[key];
            const isActive =
              activePath === href || !!activePath?.startsWith(`${href}/`);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  render={<Link href={href} />}
                  isActive={isActive}
                  tooltip={label}
                  className="relative pl-8 group-data-[collapsible=icon]:pl-2"
                >
                  <NetworkNode isActive={isActive} />
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
      </LayoutGroup>
    </MotionConfig>
  );
}

// POR QUÉ: el punto encendido es un solo elemento compartido (layoutId); al navegar recorre el trazo hasta el
// nodo nuevo con un resorte, en lugar de apagarse en uno y encenderse en otro.
function NetworkNode({ isActive }: { isActive: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 left-[10px] size-3 -translate-y-1/2 rounded-full border-2 border-white/60 bg-(--panel-base) group-data-[collapsible=icon]:hidden"
    >
      {isActive && (
        <motion.span
          layoutId="kr-nav-active"
          className="absolute -inset-[3px] rounded-full bg-white shadow-[0_0_0_4px_oklch(1_0_0/0.16),0_0_18px_oklch(0.82_0.12_250/0.9)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
    </span>
  );
}
