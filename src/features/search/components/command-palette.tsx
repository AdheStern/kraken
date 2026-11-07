// src/features/search/components/command-palette.tsx
// Paleta de Ctrl+K (o el botón de la cabecera): ejecuta las acciones de la pantalla, lleva a las pantallas del rol y
// busca CV, tickets, productos, seriales, documentación, clientes y contactos (decisiones 2026-11-05 y 2026-11-07).
"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState, useTransition } from "react";
import {
  ActiveShortcutsContext,
  ShortcutsContext,
} from "@/components/shortcuts/shortcuts-provider";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Command, CommandInput } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchEverything } from "../actions/search-everything";
import type { SearchGroup } from "../types";
import {
  type CommandEntry,
  CommandResults,
  type PalettePage,
  screenActions,
} from "./command-results";

const DEBOUNCE_MS = 250;

export type { PalettePage };

export function CommandPalette({ pages }: { pages: readonly PalettePage[] }) {
  const router = useRouter();
  const shortcuts = use(ShortcutsContext);
  const active = use(ActiveShortcutsContext);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<SearchGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function run(entry: CommandEntry) {
    setOpen(false);
    setQuery("");
    if ("href" in entry) return router.push(entry.href);
    // POR QUÉ: la acción corre cuando la paleta ya se cerró; si abre su propio diálogo (Nuevo CV), no compite con ella.
    setTimeout(() => {
      if (entry.shortcut === "help") shortcuts?.openHelp();
      else shortcuts?.trigger(entry.shortcut);
    }, 0);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Buscar en Kraken</DialogTitle>
        <DialogDescription className="sr-only">
          Escribe para filtrar acciones y pantallas; con dos letras busca
          también número de CV, cliente, ticket, producto, serial o proyecto.
        </DialogDescription>
        {/* POR QUÉ: los resultados del servidor ya vienen filtrados; cmdk no debe volver a esconderlos (un serial
            parcial no se parece al texto que muestra la fila). */}
        <Command shouldFilter={false} loop className="p-2">
          <CommandInput
            aria-label="Buscar en Kraken"
            placeholder="Acción, pantalla, CV, cliente, ticket, serial…"
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandResults
            query={query.trim()}
            actions={screenActions(active)}
            pages={pages}
            found={query.trim().length >= 2 ? found : []}
            isPending={isPending}
            error={error}
            onRun={run}
          />
        </Command>
      </DialogContent>
    </Dialog>
  );
}
