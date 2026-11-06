// src/components/shortcuts/use-shortcuts.ts
// Registra los atajos de una pantalla mientras está montada; el resumen («?») muestra solo los registrados.
"use client";

import { use, useEffect, useRef } from "react";
import type { ShortcutId } from "./shortcut-registry";
import { ShortcutsContext } from "./shortcuts-provider";

export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

export function useShortcuts(handlers: ShortcutHandlers): void {
  const registry = use(ShortcutsContext);
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const ids = Object.keys(handlers).sort().join(",");
  useEffect(() => {
    if (!registry || !ids) return;
    // POR QUÉ: se registra una función estable que llama al manejador más reciente; así un render no re-registra.
    const unregister = ids
      .split(",")
      .map((id) =>
        registry.register(id as ShortcutId, () =>
          latest.current[id as ShortcutId]?.(),
        ),
      );
    return () => {
      for (const off of unregister) off();
    };
  }, [registry, ids]);
}
