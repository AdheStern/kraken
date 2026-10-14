// src/features/calendar/components/weekday-slots-row.tsx
// Un día del horario: su barra de 24 h y sus franjas editables (inicio y fin), con alta y baja de franjas.
"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SlotView } from "../types";
import { DayBar } from "./day-bar";

export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

type Props = {
  weekday: number;
  slots: SlotView[];
  onChange: (slots: SlotView[]) => void;
};

export function WeekdaySlotsRow({ weekday, slots, onChange }: Props) {
  const name = WEEKDAYS[weekday - 1];
  const update = (index: number, patch: Partial<SlotView>) =>
    onChange(
      slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  return (
    <li className="grid gap-2 py-3 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-4">
      <span className="text-sm font-medium">{name}</span>
      <DayBar slots={slots} isOff={slots.length === 0} />
      <div className="flex flex-wrap items-center gap-2">
        {slots.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Fuera de horario todo el día
          </span>
        )}
        {slots.map((slot, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: las franjas no tienen id hasta guardarse
            key={index}
            className="flex items-center gap-1 rounded-lg border bg-background px-1.5 py-1"
          >
            <Input
              inputMode="numeric"
              maxLength={5}
              placeholder="08:30"
              value={slot.start}
              onChange={(e) => update(index, { start: e.target.value })}
              aria-label={`${name}, inicio de la franja ${index + 1}`}
              className="h-7 w-[4.25rem] border-0 bg-transparent px-1 text-center dark:bg-transparent tabular-nums shadow-none"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              –
            </span>
            <Input
              inputMode="numeric"
              maxLength={5}
              placeholder="08:30"
              value={slot.end}
              onChange={(e) => update(index, { end: e.target.value })}
              aria-label={`${name}, fin de la franja ${index + 1}`}
              className="h-7 w-[4.25rem] border-0 bg-transparent px-1 text-center dark:bg-transparent tabular-nums shadow-none"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(slots.filter((_, i) => i !== index))}
              aria-label={`Quitar la franja ${index + 1} del ${name.toLowerCase()}`}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...slots, nextSlot(weekday, slots)])}
        >
          <Plus aria-hidden="true" />
          Franja
        </Button>
      </div>
    </li>
  );
}

// POR QUÉ: la franja nueva empieza donde termina la última, para no proponer un solape.
function nextSlot(weekday: number, slots: SlotView[]): SlotView {
  const last = slots.at(-1);
  if (!last) return { weekday, start: "08:30", end: "18:30" };
  return {
    weekday,
    start: last.end,
    end: last.end < "23:00" ? "23:00" : "24:00",
  };
}
