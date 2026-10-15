// src/components/ui/date-picker.tsx
// Selector de fecha con el Calendar de shadcn en un Popover: reemplaza al <input type="date"> nativo, cuyo
// calendario pinta el sistema operativo (blanco en modo oscuro, en inglés). El valor es "YYYY-MM-DD" o "".
"use client";

import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  // Para formularios GET sin JavaScript: el valor viaja en un campo oculto.
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  // Fecha opcional: muestra "Quitar fecha" en el calendario.
  clearable?: boolean;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
};

const display = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function DatePicker({
  value,
  onChange,
  id,
  name,
  disabled,
  placeholder = "Elige una fecha",
  clearable,
  min,
  max,
  className,
  ...aria
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              // POR QUÉ: con el borde y el fondo de Input, para que se lea como un campo más y no como un botón.
              "w-full justify-start border-input bg-transparent px-2.5 font-normal hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent dark:bg-input/30",
              !selected && "text-muted-foreground",
              className,
            )}
            {...aria}
          />
        }
      >
        <CalendarDays aria-hidden="true" className="text-muted-foreground" />
        <span className="truncate">
          {selected ? display.format(selected) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
      </PopoverContent>
      {name && <input type="hidden" name={name} value={value} />}
    </Popover>
  );
}

// TRAMPA: "2026-10-15" con new Date() es medianoche UTC y en La Paz cae el día anterior; se arma en hora local.
function toDate(text: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toText(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
