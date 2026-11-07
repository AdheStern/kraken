// src/components/shortcuts/shortcuts-provider.tsx
// Escucha el teclado de toda la app y ejecuta el atajo registrado por la pantalla en curso; «?» abre el resumen.
// Mientras se escribe en un campo solo valen las combinaciones con Ctrl o Alt (decisión 2026-11-05).
"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IDLE, isModified, resolveShortcut } from "./shortcut-match";
import { SHORTCUTS, type ShortcutId } from "./shortcut-registry";
import { ShortcutsDialog } from "./shortcuts-dialog";

type Registry = {
  register: (id: ShortcutId, run: () => void) => () => void;
  openHelp: () => void;
  // Ejecuta un atajo registrado como si se hubiera pulsado (botones de la cabecera y la paleta de Ctrl+K).
  trigger: (id: ShortcutId) => void;
};

export const ShortcutsContext = createContext<Registry | null>(null);
// TRAMPA: los atajos activos van en otro contexto; en el del registro, cada alta cambiaría su valor, useShortcuts
// volvería a registrar y el ciclo no terminaría. Los lee la paleta de Ctrl+K.
export const ActiveShortcutsContext = createContext<readonly ShortcutId[]>([]);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Map<ShortcutId, () => void>());
  const [active, setActive] = useState<ShortcutId[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);

  const register = useCallback((id: ShortcutId, run: () => void) => {
    // POR QUÉ: borrar antes de volver a poner deja el registro más reciente al final del orden del Map.
    handlers.current.delete(id);
    handlers.current.set(id, run);
    setActive([...handlers.current.keys()]);
    return () => {
      if (handlers.current.get(id) === run) handlers.current.delete(id);
      setActive([...handlers.current.keys()]);
    };
  }, []);

  useEffect(() => {
    let sequence = IDLE;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing) return;
      const typing = isTypingTarget(event.target);
      const ids: ShortcutId[] = ["help", ...handlers.current.keys()];
      const combos = ids
        .map((id) => SHORTCUTS[id].keys)
        .filter((keys) => !typing || isModified(keys));
      const result = resolveShortcut(combos, event, sequence, event.timeStamp);
      sequence = result.state;
      // TRAMPA: con Cache Components la página anterior queda montada; si dos atajos comparten teclas (Alt+N en la
      // lista y en el editor), gana el registrado más tarde, que es el de la pantalla que se ve.
      const id = ids.findLast((i) => SHORTCUTS[i].keys === result.match);
      if (!id) return;
      event.preventDefault();
      if (id === "help") setHelpOpen(true);
      else handlers.current.get(id)?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({
      register,
      openHelp: () => setHelpOpen(true),
      trigger: (id: ShortcutId) => handlers.current.get(id)?.(),
    }),
    [register],
  );
  return (
    <ShortcutsContext value={value}>
      <ActiveShortcutsContext value={active}>{children}</ActiveShortcutsContext>
      <ShortcutsDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        active={active}
      />
    </ShortcutsContext>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}
