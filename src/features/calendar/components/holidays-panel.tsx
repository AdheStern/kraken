// src/features/calendar/components/holidays-panel.tsx
// Feriados de un año: alta en línea (nacional o de una ciudad), edición en el lugar y baja lógica. Un feriado
// cuenta entero como fuera de horario en la ciudad donde rige (AGENTS.md §2.5).
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertHoliday } from "../actions/upsert-holiday";
import type { CityScheduleView, HolidayView } from "../types";
import { HolidayRow } from "./holiday-row";
import { HolidayScopeSelect } from "./holiday-scope-select";

type Props = {
  year: number;
  holidays: HolidayView[];
  cities: CityScheduleView[];
};

export function HolidaysPanel({ year, holidays, cities }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    date: string;
    name: string;
    cityId: string | null;
  }>({ date: "", name: "", cityId: null });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function add() {
    setIsPending(true);
    setError(null);
    const result = await upsertHoliday(draft);
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setDraft({ date: "", name: "", cityId: draft.cityId });
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <form
        className="kr-surface grid gap-2 rounded-xl p-3 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Input
          type="date"
          value={draft.date}
          min={`${year}-01-01`}
          max={`${year}-12-31`}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          aria-label="Fecha del feriado"
          className="h-9"
        />
        <Input
          value={draft.name}
          placeholder="Nombre del feriado"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Nombre del feriado"
          className="h-9"
        />
        <HolidayScopeSelect
          value={draft.cityId}
          cities={cities}
          onChange={(cityId) => setDraft({ ...draft, cityId })}
        />
        <Button type="submit" size="sm" className="h-9" disabled={isPending}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Agregar feriado
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {holidays.length === 0 ? (
        <KrakenEmpty compact title={`No hay feriados cargados para ${year}.`}>
          Agrega los nacionales y los de cada ciudad; sin ellos esos días
          cuentan como laborables.
        </KrakenEmpty>
      ) : (
        <ul className="kr-surface divide-y divide-border/60 rounded-xl">
          {holidays.map((h) => (
            <HolidayRow
              key={h.id}
              holiday={h}
              cities={cities}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
