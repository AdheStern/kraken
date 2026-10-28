// src/features/tickets/components/manual-entry-form.tsx
// Carga manual de un tramo, alternativa al contador: fecha (hoy por defecto), hora de inicio y fin en 24 h (hora de
// La Paz, «Ahora» pone la actual) y dónde se registra (AGENTS.md §2.6; tardío si se carga más de 48 h después).
"use client";

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import {
  BUSINESS_TIME_ZONE,
  toBusinessDate,
} from "@/domain/calendar/business-date";
import { addManualTimeEntry } from "../actions/add-manual-time-entry";
import type { TicketTime } from "../types";
import { useTicketAction } from "./use-ticket-action";

type Props = { ticketId: string; targets: TicketTime["targets"] };

// TRAMPA: las horas se escriben en hora de La Paz, no en la del navegador (regla 5).
const toInstant = (date: string, time: string) =>
  fromZonedTime(`${date}T${time}`, BUSINESS_TIME_ZONE).toISOString();

export function ManualEntryForm({ ticketId, targets }: Props) {
  const [date, setDate] = useState(() => toBusinessDate(new Date()));
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [target, setTarget] = useState<string>(targets[0]?.id ?? "ticket");
  const { run, isPending, error } = useTicketAction();
  const isComplete = Boolean(date && start && end);

  async function save() {
    const saved = await run(() =>
      addManualTimeEntry({
        ticketId,
        subtaskId: target === "ticket" ? null : target,
        startedAt: toInstant(date, start),
        endedAt: toInstant(date, end),
      }),
    );
    if (saved) {
      setStart("");
      setEnd("");
    }
  }

  return (
    <div className="kr-surface flex flex-col gap-3 rounded-xl p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem_1fr_auto] sm:items-end">
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Fecha
          <DatePicker value={date} onChange={setDate} />
        </Label>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Inicio
          <Input
            type="time"
            step={60}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="tabular-nums"
          />
        </Label>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          <span className="flex items-center justify-between">
            Fin
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                const now = new Date();
                setDate(toBusinessDate(now));
                setEnd(formatInTimeZone(now, BUSINESS_TIME_ZONE, "HH:mm"));
              }}
            >
              Ahora
            </button>
          </span>
          <Input
            type="time"
            step={60}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="tabular-nums"
          />
        </Label>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Registrar en
          <OptionSelect
            value={target}
            options={targets.map((t) => ({
              id: t.id ?? "ticket",
              label: t.label,
            }))}
            onValueChange={(v) => v && setTarget(v)}
          />
        </Label>
        <Button onClick={save} disabled={!isComplete || isPending}>
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Registrar
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
