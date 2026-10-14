// src/features/calendar/components/holiday-scope-select.tsx
// Dónde rige un feriado: nacional (sin ciudad) o en una ciudad (departamental), AGENTS.md §2.5.
"use client";

import { cn } from "@/lib/utils";
import type { CityScheduleView } from "../types";

const NATIONAL = "NACIONAL";

type Props = {
  value: string | null;
  cities: CityScheduleView[];
  onChange: (cityId: string | null) => void;
  className?: string;
};

export function HolidayScopeSelect({
  value,
  cities,
  onChange,
  className,
}: Props) {
  return (
    <select
      value={value ?? NATIONAL}
      onChange={(e) =>
        onChange(e.target.value === NATIONAL ? null : e.target.value)
      }
      aria-label="Dónde rige"
      className={cn(
        "h-9 rounded-lg border bg-background px-2 text-sm",
        className,
      )}
    >
      <option value={NATIONAL}>Nacional</option>
      {cities.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
