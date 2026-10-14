// src/features/calendar/components/holidays-panel.tsx
// Feriados de un año: alta en línea (nacional o de una ciudad) y baja lógica. Un feriado cuenta entero como
// fuera de horario en la ciudad donde rige (AGENTS.md §2.5).
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deactivateHoliday } from "../actions/deactivate-holiday";
import { upsertHoliday } from "../actions/upsert-holiday";
import type { CityScheduleView, HolidayView } from "../types";

const NATIONAL = "NACIONAL";
const dateFormat = new Intl.DateTimeFormat("es-BO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

type Props = {
  year: number;
  holidays: HolidayView[];
  cities: CityScheduleView[];
};

export function HolidaysPanel({ year, holidays, cities }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState({ date: "", name: "", scope: NATIONAL });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function add() {
    setIsPending(true);
    setError(null);
    const result = await upsertHoliday({
      date: draft.date,
      name: draft.name,
      cityId: draft.scope === NATIONAL ? null : draft.scope,
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setDraft({ date: "", name: "", scope: draft.scope });
    router.refresh();
  }

  async function remove(id: string) {
    const result = await deactivateHoliday({ id });
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <form
        className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_auto]"
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
        <select
          value={draft.scope}
          onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
          aria-label="Dónde rige"
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value={NATIONAL}>Nacional</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
        <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          No hay feriados cargados para {year}. Agrega los nacionales y los de
          cada ciudad; sin ellos esos días cuentan como laborables.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2 text-sm"
            >
              <span className="tabular-nums text-muted-foreground">
                {dateFormat.format(new Date(`${h.date}T00:00:00Z`))}
              </span>
              <span className="truncate">{h.name}</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {h.cityCode ?? "Nacional"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(h.id)}
                aria-label={`Quitar ${h.name}`}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
