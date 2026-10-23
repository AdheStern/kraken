// src/features/dashboards/components/goal-cell.tsx
// Celda editable de una meta mensual: guarda al salir o con Enter, Escape descarta; vacía quita la meta
// (AGENTS.md §6). El error se anuncia y la celda queda marcada hasta corregirla.
"use client";

import { useState, useTransition } from "react";
import type { GoalIndicator } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { upsertGoal } from "../actions/upsert-goal";

type Props = {
  areaId: string | null;
  indicator: GoalIndicator;
  year: number;
  month: number;
  initial: string;
  label: string;
};

export function GoalCell({
  areaId,
  indicator,
  year,
  month,
  initial,
  label,
}: Props) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (value.trim() === saved.trim()) return;
    startTransition(async () => {
      const result = await upsertGoal({
        areaId,
        indicator,
        year,
        month,
        value,
      });
      if (result.ok) {
        setSaved(value);
        setError(null);
      } else setError(result.error.message);
    });
  }

  return (
    <>
      <input
        value={value}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        title={error ?? undefined}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(saved);
            setError(null);
          }
        }}
        className={cn(
          "h-8 w-full min-w-18 rounded-md border border-transparent bg-muted/50 px-2 text-right text-sm tabular-nums outline-none hover:border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          isPending && "opacity-60",
          error && "border-destructive ring-3 ring-destructive/20",
        )}
      />
      {error && (
        <span role="alert" className="sr-only">
          {label}: {error}
        </span>
      )}
    </>
  );
}
