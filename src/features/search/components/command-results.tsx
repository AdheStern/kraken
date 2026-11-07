// src/features/search/components/command-results.tsx
// Lista de la paleta de Ctrl+K: acciones de la pantalla con su atajo, pantallas del rol con su «G + letra» y los
// resultados de la búsqueda agrupados; cmdk mueve el resaltado con las flechas y Enter ejecuta.
"use client";

import { LoaderCircle } from "lucide-react";
import { ShortcutKeys } from "@/components/shortcuts/shortcut-keys";
import {
  SHORTCUTS,
  type ShortcutId,
} from "@/components/shortcuts/shortcut-registry";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import type { SearchGroup } from "../types";

export type PalettePage = {
  label: string;
  href: string;
  shortcut?: ShortcutId;
};

export type CommandEntry =
  | {
      id: string;
      label: string;
      hint?: string | null;
      href: string;
      shortcut?: ShortcutId;
    }
  | { id: string; label: string; shortcut: ShortcutId };

// POR QUÉ: estos atajos llevan el foco a un campo de la pantalla; desde la paleta, el cierre del diálogo se lo quita.
const ONLY_KEYBOARD = new Set<ShortcutId>([
  "search",
  "help",
  "list.filter",
  "inv.scan",
  "inv.products",
  "cv.lineDetail",
  "ticket.comment",
]);

export function screenActions(active: readonly ShortcutId[]): CommandEntry[] {
  // TRAMPA: con Cache Components puede quedar registrada la pantalla anterior; como en el teclado, gana la más
  // reciente cuando dos acciones comparten teclas.
  const byKeys = new Map<string, ShortcutId>();
  for (const id of active)
    if (!id.startsWith("nav.") && !ONLY_KEYBOARD.has(id))
      byKeys.set(SHORTCUTS[id].keys, id);
  return [...byKeys.values(), "help" as const].map((id) => ({
    id: `action-${id}`,
    label:
      id === "help" ? "Ver los atajos de teclado" : SHORTCUTS[id].description,
    shortcut: id,
  }));
}

type Props = {
  query: string;
  actions: CommandEntry[];
  pages: readonly PalettePage[];
  found: SearchGroup[];
  isPending: boolean;
  error: string | null;
  onRun: (entry: CommandEntry) => void;
};

export function CommandResults({
  query,
  actions,
  pages,
  found,
  isPending,
  error,
  onRun,
}: Props) {
  const groups: { label: string; entries: CommandEntry[] }[] = [
    {
      label: "Acciones",
      entries: actions.filter((a) => matches(a.label, query)),
    },
    {
      label: "Ir a",
      entries: pages
        .filter((p) => matches(p.label, query))
        .map((p) => ({ id: `page-${p.href}`, ...p })),
    },
    ...found.map((g) => ({
      label: g.label,
      entries: g.items.map((item) => ({
        ...item,
        id: `${g.label}-${item.id}`,
      })),
    })),
  ].filter((g) => g.entries.length > 0);

  return (
    <CommandList className="mt-2 max-h-[55vh]">
      {error && (
        <p role="alert" className="px-2 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {isPending && (
        <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Buscando…
        </p>
      )}
      <CommandEmpty className="px-2 py-3 text-left text-sm text-muted-foreground">
        {query.length < 2
          ? "Escribe al menos dos letras para buscar en CV, tickets, productos y clientes."
          : "Sin resultados. Prueba con el número del CV, el NIT o parte del serial."}
      </CommandEmpty>
      {groups.map((group) => (
        <CommandGroup key={group.label} heading={group.label}>
          {group.entries.map((entry) => (
            <CommandItem
              key={entry.id}
              value={entry.id}
              onSelect={() => onRun(entry)}
            >
              <span className="min-w-0 truncate">{entry.label}</span>
              <CommandShortcut className="flex min-w-0 items-center gap-2 tracking-normal">
                {"hint" in entry && entry.hint && (
                  <span className="truncate">{entry.hint}</span>
                )}
                {entry.shortcut && (
                  <ShortcutKeys keys={SHORTCUTS[entry.shortcut].keys} />
                )}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  );
}

function matches(label: string, query: string): boolean {
  return fold(label).includes(fold(query));
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
