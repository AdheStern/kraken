// src/features/calendar/components/city-schedules.tsx
// Horario que rige en cada ciudad; los tickets se ponderan con el de su ciudad (AGENTS.md §2.5).
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCitySchedule } from "../actions/assign-city-schedule";
import type { CityScheduleView, ScheduleView } from "../types";

const NONE = "SIN_HORARIO";

type Props = { cities: CityScheduleView[]; schedules: ScheduleView[] };

export function CitySchedules({ cities, schedules }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const scheduleName = (id: string) =>
    id === NONE
      ? "Sin horario (todo fuera)"
      : (schedules.find((s) => s.id === id)?.name ?? "Horario");

  async function assign(cityId: string, value: string) {
    setError(null);
    const result = await assignCitySchedule({
      cityId,
      scheduleId: value === NONE ? null : value,
    });
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <ul className="kr-surface divide-y divide-border/60 rounded-xl">
        {cities.map((city) => (
          <li
            key={city.id}
            className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <span className="text-sm">
              <span className="font-medium tabular-nums">{city.code}</span>
              <span className="text-muted-foreground"> · {city.name}</span>
            </span>
            <Select
              value={city.scheduleId ?? NONE}
              onValueChange={(value) => assign(city.id, String(value))}
            >
              <SelectTrigger
                className="w-full sm:w-56"
                aria-label={`Horario de ${city.name}`}
              >
                <SelectValue>
                  {(value: string) => scheduleName(value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {schedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={NONE}>Sin horario (todo fuera)</SelectItem>
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
