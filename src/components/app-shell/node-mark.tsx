// src/components/app-shell/node-mark.tsx
// Nodo hueco de la red del isotipo junto a un título: ata cada pantalla a la red del riel (DESIGN.md).
import { cn } from "@/lib/utils";

export function NodeMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full border-[3px] border-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_14%,transparent)]",
        className,
      )}
    >
      <span className="size-1 rounded-full bg-primary" />
    </span>
  );
}
