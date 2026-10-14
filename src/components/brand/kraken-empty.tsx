// src/components/brand/kraken-empty.tsx
// Estado vacío con el kraken en un nodo hueco de la red: dice qué pasó y qué hacer (AGENTS.md §5, PRODUCT.md).
// "curious" cuando un filtro no encontró nada; "idle" cuando aún no hay datos.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KrakenMark } from "./kraken-mark";

type Props = {
  title: string;
  children?: ReactNode;
  mood?: "idle" | "curious";
  compact?: boolean;
};

export function KrakenEmpty({
  title,
  children,
  mood = "idle",
  compact = false,
}: Props) {
  return (
    <div
      className={cn(
        "kr-surface flex flex-col items-center gap-2 rounded-xl px-6 text-center",
        compact ? "py-8" : "py-14",
      )}
    >
      <span className="mb-1 grid size-16 place-items-center rounded-full border-[3px] border-primary/25 bg-primary/5">
        <KrakenMark className="size-10" mood={mood} />
      </span>
      <p className="font-medium">{title}</p>
      {children && (
        <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
