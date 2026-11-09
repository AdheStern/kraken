// src/components/ui/date-range-picker.tsx
// Selector de un rango de fechas: se escribe ("dd/mm/aaaa – dd/mm/aaaa"; una sola fecha es un día) o se elige en
// el Calendar de shadcn (dos meses, dos clics). Los valores son "YYYY-MM-DD" o "". Si el calendario se cierra con
// solo el inicio, el rango es de un día.
"use client";

import { es } from "date-fns/locale";
import { CalendarRange, X } from "lucide-react";
import { type ComponentProps, useState } from "react";
import type { DateRange } from "react-day-picker";
import { parseLocalDateText, toLocalDateText } from "@/lib/local-date-text";
import { formatTypedDate, parseTypedRange } from "@/lib/parse-typed-date";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { DateField } from "./date-field";
import { useTypedField } from "./use-typed-field";

type Props = Omit<
  ComponentProps<"input">,
  "onChange" | "value" | "defaultValue"
> & {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
};

export function DateRangePicker({
  start,
  end,
  onChange,
  placeholder = "dd/mm/aaaa – dd/mm/aaaa",
  className,
  ...input
}: Props) {
  const [open, setOpen] = useState(false);
  const from = parseLocalDateText(start);
  const to = parseLocalDateText(end);
  const field = useTypedField({
    shown: toRangeText(start, end),
    read: (text) => {
      if (text.trim() === "") return "";
      const range = parseTypedRange(text);
      return range ? toRangeText(range.start, range.end) : null;
    },
    commit: (text) => {
      const range = parseTypedRange(text);
      onChange(range?.start ?? "", range?.end ?? "");
    },
  });

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
    <DateField
      icon={CalendarRange}
      open={open}
      onOpenChange={changeOpen}
      calendarLabel="Abrir el calendario del rango"
      formatHint="dd/mm/aaaa – dd/mm/aaaa"
      className={className}
      input={{
        ...input,
        ...field,
        placeholder,
        "aria-invalid": input["aria-invalid"] || field.invalid || undefined,
        onKeyDown: (event) => {
          field.onKeyDown(event);
          input.onKeyDown?.(event);
        },
      }}
    >
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
    </DateField>
  );
}

function toRangeText(start: string, end: string): string {
  if (!start) return "";
  return !end || end === start
    ? formatTypedDate(start)
    : `${formatTypedDate(start)} – ${formatTypedDate(end)}`;
}
