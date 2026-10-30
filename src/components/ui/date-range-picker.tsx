// src/components/ui/date-range-picker.tsx
// Selector de un rango de fechas con el Calendar de shadcn en un Popover (dos meses, dos clics: inicio y fin).
// Los valores son "YYYY-MM-DD" o "". Si se cierra con solo el inicio, el rango es de un día.
"use client";

import { es } from "date-fns/locale";
import { CalendarRange, X } from "lucide-react";
import { type ComponentProps, useState } from "react";
import type { DateRange } from "react-day-picker";
import { parseLocalDateText, toLocalDateText } from "@/lib/local-date-text";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Props = Omit<ComponentProps<"button">, "onChange" | "value"> & {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  placeholder?: string;
};

const display = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function DateRangePicker({
  start,
  end,
  onChange,
  disabled,
  placeholder = "Elige el rango",
  className,
  ...trigger
}: Props) {
  const [open, setOpen] = useState(false);
  const from = parseLocalDateText(start);
  const to = parseLocalDateText(end);
  const label = from
    ? `${display.format(from)} – ${to ? display.format(to) : "…"}`
    : placeholder;

  function select(range: DateRange | undefined) {
    const next = [range?.from, range?.to].map((d) =>
      d ? toLocalDateText(d) : "",
    );
    onChange(next[0], next[1]);
    if (range?.from && range.to && next[0] !== next[1]) setOpen(false);
  }

  function changeOpen(next: boolean) {
    if (!next && start && !end) onChange(start, start);
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start border-input bg-transparent px-2.5 font-normal hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent dark:bg-input/30",
              !from && "text-muted-foreground",
              className,
            )}
            {...trigger}
          />
        }
      >
        <CalendarRange aria-hidden="true" className="text-muted-foreground" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={es}
          numberOfMonths={2}
          selected={from ? { from, to } : undefined}
          defaultMonth={from}
          onSelect={select}
        />
        {from && (
          <Button
            variant="ghost"
            size="sm"
            className="mx-2 mb-2 self-start"
            onClick={() => {
              onChange("", "");
              setOpen(false);
            }}
          >
            <X aria-hidden="true" />
            Quitar rango
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
