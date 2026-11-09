// src/components/ui/date-field.tsx
// Marco común de DatePicker y DateRangePicker: un campo donde se escribe la fecha y, al costado, el botón que
// abre el calendario en un Popover anclado al campo entero. Alt+↓ también lo abre; al enfocarlo, el placeholder
// pasa a mostrar el formato que se espera.
"use client";

import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./input-group";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Props = {
  icon: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: ComponentProps<"input">;
  // Formato que se muestra como placeholder mientras el campo tiene el foco.
  formatHint: string;
  calendarLabel: string;
  className?: string;
  children: ReactNode;
};

export function DateField({
  icon: Icon,
  open,
  onOpenChange,
  input,
  formatHint,
  calendarLabel,
  className,
  children,
}: Props) {
  const anchor = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <InputGroup
        ref={anchor}
        className={cn("h-9", className)}
        data-disabled={input.disabled || undefined}
      >
        <InputGroupInput
          autoComplete="off"
          {...input}
          placeholder={focused ? formatHint : input.placeholder}
          className="px-2.5"
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            input.onBlur?.(event);
          }}
          onKeyDown={(event) => {
            if (event.altKey && event.key === "ArrowDown") {
              event.preventDefault();
              onOpenChange(true);
              return;
            }
            input.onKeyDown?.(event);
          }}
        />
        <InputGroupAddon align="inline-end">
          <PopoverTrigger
            render={
              <InputGroupButton
                size="icon-xs"
                aria-label={calendarLabel}
                disabled={input.disabled}
              />
            }
          >
            <Icon aria-hidden="true" className="text-muted-foreground" />
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
      <PopoverContent className="w-auto p-0" align="start" anchor={anchor}>
        {children}
      </PopoverContent>
    </Popover>
  );
}
