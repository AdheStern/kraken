// src/components/shortcuts/shortcuts-button.tsx
// Botón de la cabecera que abre el resumen de atajos de teclado (lo mismo que «?»).
"use client";

import { Keyboard } from "lucide-react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { ShortcutsContext } from "./shortcuts-provider";

export function ShortcutsButton() {
  const registry = use(ShortcutsContext);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="hidden size-8 md:inline-flex"
      onClick={() => registry?.openHelp()}
      aria-label="Atajos de teclado"
      data-tour="atajos"
      title="Atajos de teclado (?)"
    >
      <Keyboard aria-hidden="true" />
    </Button>
  );
}
