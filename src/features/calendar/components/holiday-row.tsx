// src/features/calendar/components/holiday-row.tsx
// Un feriado del año: se lee en una línea y se edita en el lugar (fecha, nombre y dónde rige) o se quita.
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { deactivateHoliday } from "../actions/deactivate-holiday";
import { updateHoliday } from "../actions/update-holiday";
import type { CityScheduleView, HolidayView } from "../types";
import { HolidayScopeSelect } from "./holiday-scope-select";

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

type Props = {
  holiday: HolidayView;
  cities: CityScheduleView[];
  onError: (message: string | null) => void;
};

export function HolidayRow({ holiday, cities, onError }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [draft, setDraft] = useState({
    date: holiday.date,
    name: holiday.name,
    cityId: holiday.cityId,
  });

  async function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    setIsPending(true);
    onError(null);
    const result = await action();
    setIsPending(false);
    if (!result.ok)
      return onError(result.error?.message ?? "No se pudo guardar.");
    setIsEditing(false);
    router.refresh();
  }

  if (isEditing)
    return (
      <li className="grid gap-2 px-4 py-2 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_auto_auto] sm:items-center">
        <DatePicker
          value={draft.date}
          onChange={(date) => setDraft({ ...draft, date })}
          aria-label={`Nueva fecha de ${holiday.name}`}
        />
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label={`Nuevo nombre de ${holiday.name}`}
          className="h-9"
        />
        <HolidayScopeSelect
          value={draft.cityId}
          cities={cities}
          onChange={(cityId) => setDraft({ ...draft, cityId })}
        />
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run(() => updateHoliday({ id: holiday.id, ...draft }))}
        >
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Guardar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          Cancelar
        </Button>
      </li>
    );

  return (
    <li className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto_auto_auto] items-center gap-2 px-4 py-2 text-sm">
      <span className="tabular-nums text-muted-foreground">
        {dateFormat.format(new Date(`${holiday.date}T00:00:00Z`))}
      </span>
      <span className="truncate">{holiday.name}</span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {holiday.cityCode ?? "Nacional"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        aria-label={`Editar ${holiday.name}`}
      >
        Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        aria-label={`Quitar ${holiday.name}`}
        onClick={() => run(() => deactivateHoliday({ id: holiday.id }))}
      >
        Quitar
      </Button>
    </li>
  );
}
