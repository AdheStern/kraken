// src/components/app-shell/app-nav.tsx
// Navegación principal del riel: marca el módulo activo según la ruta.
"use client";

import { FileSpreadsheet, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                render={<Link href={href} />}
                isActive={pathname === href || pathname.startsWith(`${href}/`)}
                tooltip={label}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
