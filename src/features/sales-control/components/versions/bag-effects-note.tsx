// src/features/sales-control/components/versions/bag-effects-note.tsx
// Aviso en el borrador de lo que su aprobación hará con las bolsas de horas, o de por qué no se podrá enviar
// (AGENTS.md §2.4 "Versiones del CV"; los errores dicen qué hacer, §5).
import { Hourglass, TriangleAlert } from "lucide-react";
import type { BagEffects } from "@/features/hours/queries/get-version-bag-effects";
import { formatMinutes } from "@/lib/format-minutes";

export function BagEffectsNote({ effects }: { effects: BagEffects }) {
  if (effects.problem)
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>No se podrá enviar: {effects.problem}</span>
      </p>
    );
  const parts = [
    ...effects.opened.map((d) => `abre la bolsa de «${d}»`),
    ...effects.adjusted.map(
      (a) =>
        `${a.deltaMinutes > 0 ? "suma" : "resta"} ${formatMinutes(Math.abs(a.deltaMinutes))} a «${a.description}»`,
    ),
    ...effects.closed.map((d) => `cierra la bolsa de «${d}» (línea quitada)`),
  ];
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
      <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground">Al aprobarse:</span>{" "}
        {parts.join(" · ")}.
      </span>
    </p>
  );
}
