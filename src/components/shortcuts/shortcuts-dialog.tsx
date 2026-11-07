// src/components/shortcuts/shortcuts-dialog.tsx
// Resumen de los atajos de teclado que valen ahora, por sección («?» o el botón del teclado en la cabecera).
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShortcutKeys } from "./shortcut-keys";
import { SHORTCUTS, type ShortcutId } from "./shortcut-registry";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: readonly ShortcutId[];
};

export function ShortcutsDialog({ open, onOpenChange, active }: Props) {
  const ids: ShortcutId[] = ["help", ...active.filter((id) => id !== "help")];
  const sections = new Map<string, ShortcutId[]>();
  for (const id of ids) {
    const { section } = SHORTCUTS[id];
    sections.set(section, [...(sections.get(section) ?? []), id]);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>
            Los que valen en esta pantalla. «G + letra» lleva a cada módulo y
            Ctrl+K busca y ejecuta las acciones de la pantalla; mientras
            escribes en un campo solo valen los que llevan Ctrl o Alt.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {[...sections].map(([section, sectionIds]) => (
            <section key={section} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase">
                {section}
              </h3>
              <dl className="flex flex-col gap-1">
                {sectionIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <dt>{SHORTCUTS[id].description}</dt>
                    <dd>
                      <ShortcutKeys keys={SHORTCUTS[id].keys} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
