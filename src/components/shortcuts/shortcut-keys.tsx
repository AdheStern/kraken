// src/components/shortcuts/shortcut-keys.tsx
// Teclas de un atajo como teclas físicas: «Ctrl+K» → Ctrl + K; la secuencia «G C» también → G + C (decisión
// 2026-11-07): la G seguida de la letra navega aunque se suelten o se pulsen casi juntas.

export function ShortcutKeys({ keys }: { keys: string }) {
  const steps = keys.split(" ");
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {steps
        .flatMap((step) => step.split("+"))
        .map((key, i) => (
          <span key={key} className="inline-flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">+</span>}
            <kbd className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-[0.7rem] text-foreground">
              {key}
            </kbd>
          </span>
        ))}
    </span>
  );
}
