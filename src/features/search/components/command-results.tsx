// src/features/search/components/command-results.tsx
// Resultados de la búsqueda global agrupados; el resaltado sigue las flechas y el ratón abre con un clic.
"use client";

import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import type { SearchGroup, SearchItem } from "../types";

type Props = {
  groups: SearchGroup[];
  activeId: string | null;
  isPending: boolean;
  query: string;
  error: string | null;
  onPick: (item: SearchItem) => void;
};

export function CommandResults({
  groups,
  activeId,
  isPending,
  query,
  error,
  onPick,
}: Props) {
  if (error)
    return (
      <p role="alert" className="px-2 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  if (groups.length === 0)
    return (
      <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
        {isPending && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        )}
        {query.length < 2
          ? "Escribe al menos dos letras."
          : isPending
            ? "Buscando…"
            : "Sin resultados. Prueba con el número del CV, el NIT o parte del serial."}
      </p>
    );
  return (
    <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase">
            {group.label}
          </h3>
          {group.items.map((item) => (
            <button
              key={`${group.label}-${item.id}`}
              type="button"
              aria-current={item.id === activeId || undefined}
              onClick={() => onPick(item)}
              className={cn(
                "flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm",
                item.id === activeId
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              )}
            >
              <span className="min-w-0 truncate">{item.label}</span>
              {item.hint && (
                <span className="shrink-0 truncate text-xs text-muted-foreground">
                  {item.hint}
                </span>
              )}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
