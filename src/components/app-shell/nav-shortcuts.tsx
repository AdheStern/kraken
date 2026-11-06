// src/components/app-shell/nav-shortcuts.tsx
// «G» y luego una letra lleva a cada módulo que el rol ve en el riel (decisión 2026-11-05).
"use client";

import { useRouter } from "next/navigation";
import { navShortcutId } from "@/components/shortcuts/shortcut-registry";
import {
  type ShortcutHandlers,
  useShortcuts,
} from "@/components/shortcuts/use-shortcuts";
import type { NavKey } from "./nav-entries";

export function NavShortcuts({
  targets,
}: {
  targets: readonly { key: NavKey; href: string }[];
}) {
  const router = useRouter();
  const handlers: ShortcutHandlers = {};
  for (const { key, href } of targets) {
    const id = navShortcutId(key);
    if (id) handlers[id] = () => router.push(href);
  }
  useShortcuts(handlers);
  return null;
}
