// src/features/calendar/components/holiday-scope-select.tsx
// Dónde rige un feriado: nacional (sin ciudad) o en una ciudad (departamental), AGENTS.md §2.5.
"use client";

import { OptionSelect } from "@/components/ui/option-select";
import type { CityScheduleView } from "../types";

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
    <OptionSelect
      aria-label="Dónde rige"
      value={value}
      options={cities.map((c) => ({ id: c.id, label: c.name }))}
      emptyLabel="Nacional"
      onValueChange={onChange}
      className={className}
    />
  );
}
