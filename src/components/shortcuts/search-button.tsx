// src/components/shortcuts/search-button.tsx
// Botón «Buscar» de la cabecera: abre la búsqueda global, lo mismo que Ctrl+K (decisión 2026-11-05).
"use client";

import { Search } from "lucide-react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { ShortcutsContext } from "./shortcuts-provider";

export function SearchButton() {
  const registry = use(ShortcutsContext);
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2 text-muted-foreground"
      onClick={() => registry?.trigger("search")}
      aria-label="Buscar en Kraken"
    >
      <Search aria-hidden="true" />
      <span className="hidden sm:inline">Buscar</span>
      <kbd className="hidden rounded border bg-muted px-1 font-mono text-[0.65rem] lg:inline">
        Ctrl K
      </kbd>
    </Button>
  );
}
