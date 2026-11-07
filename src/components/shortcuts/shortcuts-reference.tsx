// src/components/shortcuts/shortcuts-reference.tsx
// Todos los atajos de teclado por sección, para la ayuda (decisión 2026-11-05); sale del mismo registro que «?».

import { ShortcutKeys } from "./shortcut-keys";
import { SHORTCUTS, type ShortcutDefinition } from "./shortcut-registry";

export function ShortcutsReference() {
  const sections = new Map<string, ShortcutDefinition[]>();
  const seen = new Set<string>();
  for (const definition of Object.values(SHORTCUTS) as ShortcutDefinition[]) {
    // POR QUÉ: Inicio y Tickets del portal repiten las teclas de los internos; se muestran una vez.
    const key = `${definition.keys}|${definition.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = sections.get(definition.section) ?? [];
    sections.set(definition.section, [...list, definition]);
  }
  return (
    <section
      aria-labelledby="atajos"
      className="kr-solid flex flex-col gap-4 rounded-xl p-5"
    >
      <div>
        <h2 id="atajos" className="text-lg font-semibold">
          Atajos de teclado
        </h2>
        <p className="text-sm text-muted-foreground">
          Pulsa «?» en cualquier pantalla para ver los que valen ahí. «G +
          letra» lleva a cada módulo que tu rol ve y Ctrl+K busca en todo y
          ejecuta las acciones de la pantalla; mientras escribes en un campo
          solo valen los que llevan Ctrl o Alt.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {[...sections].map(([section, items]) => (
          <div key={section} className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase">
              {section}
            </h3>
            <dl className="flex flex-col gap-1">
              {items.map((item) => (
                <div
                  key={`${item.keys}-${item.description}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <dt>{item.description}</dt>
                  <dd>
                    <ShortcutKeys keys={item.keys} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
