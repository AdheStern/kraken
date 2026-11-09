// src/components/ui/date-picker.tsx
// Selector de fecha: se escribe (dd/mm/aaaa, 9/11/26, 09112026…) o se elige en el Calendar de shadcn.
// Reemplaza al <input type="date"> nativo, cuyo calendario pinta el sistema operativo. El valor es "YYYY-MM-DD" o "".
"use client";

import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import {
  parseLocalDateText as toDate,
  toLocalDateText as toText,
} from "@/lib/local-date-text";
import { formatTypedDate, parseTypedDate } from "@/lib/parse-typed-date";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { DateField } from "./date-field";
import { useTypedField } from "./use-typed-field";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  // Para formularios GET sin JavaScript: el valor viaja en un campo oculto.
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  // Fecha opcional: se puede vaciar el campo y el calendario muestra "Quitar fecha".
  clearable?: boolean;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
};

export function DatePicker({
  value,
  onChange,
  id,
  name,
  disabled,
  placeholder = "dd/mm/aaaa",
  clearable,
  min,
  max,
  className,
  ...aria
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const field = useTypedField({
    shown: formatTypedDate(value),
    read: (text) => {
      if (text.trim() === "") return clearable ? "" : null;
      const iso = parseTypedDate(text);
      return iso && inRange(iso) ? formatTypedDate(iso) : null;
    },
    commit: (text) => onChange(parseTypedDate(text) ?? ""),
  });
  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <>
      <DateField
        icon={CalendarDays}
        open={open}
        onOpenChange={setOpen}
        calendarLabel="Abrir el calendario"
        formatHint="dd/mm/aaaa"
        className={className}
        input={{
          ...field,
          id,
          disabled,
          placeholder,
          "aria-label": aria["aria-label"],
          "aria-invalid": aria["aria-invalid"] || field.invalid || undefined,
        }}
      >
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => date && pick(toText(date))}
          disabled={[
            ...(min ? [{ before: toDate(min) as Date }] : []),
            ...(max ? [{ after: toDate(max) as Date }] : []),
          ]}
        />
        {clearable && selected && (
          <Button
            variant="ghost"
            size="sm"
            className="mx-2 mb-2 self-start"
            onClick={() => pick("")}
          >
            <X aria-hidden="true" />
            Quitar fecha
          </Button>
        )}
      </DateField>
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}
