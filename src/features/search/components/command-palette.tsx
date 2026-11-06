// src/features/search/components/command-palette.tsx
// Búsqueda global (Ctrl+K o el botón de la cabecera): pantallas del rol y resultados de CV, tickets, productos,
// seriales, documentación y clientes; flechas para moverse y Enter para abrir (decisión 2026-11-05).
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchEverything } from "../actions/search-everything";
import type { SearchGroup, SearchItem } from "../types";
import { CommandResults } from "./command-results";

const DEBOUNCE_MS = 250;

export type PalettePage = { label: string; href: string };

export function CommandPalette({ pages }: { pages: readonly PalettePage[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<SearchGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [isPending, startTransition] = useTransition();
  useShortcuts({ search: () => setOpen(true) });

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return setFound([]);
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchEverything(text);
        setError(result.ok ? null : result.error.message);
        setFound(result.ok ? result.data : []);
        setActive(0);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const groups = withPages(pages, query, found);
  const items = groups.flatMap((g) => g.items);

  function go(item: SearchItem | undefined) {
    if (!item) return;
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step) {
      event.preventDefault();
      setActive((i) =>
        items.length ? (i + step + items.length) % items.length : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(items[active]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] translate-y-0 gap-3 p-3 sm:max-w-xl">
        <DialogTitle className="sr-only">Buscar en Kraken</DialogTitle>
        <DialogDescription className="sr-only">
          Escribe al menos dos letras: número de CV, cliente, ticket, producto,
          serial o proyecto.
        </DialogDescription>
        <Input
          aria-label="Buscar en Kraken"
          placeholder="CV, cliente, ticket, producto, serial…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-11 text-base"
          autoFocus
        />
        <CommandResults
          groups={groups}
          activeId={items[active]?.id ?? null}
          isPending={isPending}
          query={query.trim()}
          error={error}
          onPick={go}
        />
      </DialogContent>
    </Dialog>
  );
}

function withPages(
  pages: readonly PalettePage[],
  query: string,
  found: SearchGroup[],
): SearchGroup[] {
  const text = query.trim().toLowerCase();
  const matching = pages.filter((p) => p.label.toLowerCase().includes(text));
  const pageGroup: SearchGroup = {
    label: "Ir a",
    items: matching.map((p) => ({
      id: p.href,
      label: p.label,
      hint: null,
      href: p.href,
    })),
  };
  return [
    ...(pageGroup.items.length ? [pageGroup] : []),
    ...(text.length >= 2 ? found : []),
  ];
}
