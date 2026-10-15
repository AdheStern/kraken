// src/features/calendar/components/schedule-editor.tsx
// Editor de un horario de oficina: nombre y franjas de lunes a domingo, con la barra de 24 h por día.
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deactivateOfficeSchedule } from "../actions/deactivate-office-schedule";
import { upsertOfficeSchedule } from "../actions/upsert-office-schedule";
import type { ScheduleView, SlotView } from "../types";
import { WeekdaySlotsRow } from "./weekday-slots-row";

type Props = { schedule: ScheduleView | null; onCreated?: () => void };

export function ScheduleEditor({ schedule, onCreated }: Props) {
  const router = useRouter();
  const [name, setName] = useState(schedule?.name ?? "");
  const [slots, setSlots] = useState<SlotView[]>(schedule?.slots ?? []);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);

  async function save() {
    setIsPending(true);
    setMessage(null);
    const result = await upsertOfficeSchedule({
      id: schedule?.id ?? null,
      name,
      slots,
    });
    setIsPending(false);
    if (!result.ok)
      return setMessage({ ok: false, text: result.error.message });
    setMessage({ ok: true, text: "Horario guardado." });
    onCreated?.();
    router.refresh();
  }

  async function deactivate() {
    if (!schedule) return;
    setMessage(null);
    const result = await deactivateOfficeSchedule({ id: schedule.id });
    if (!result.ok)
      return setMessage({ ok: false, text: result.error.message });
    router.refresh();
  }

  return (
    <section
      className="kr-surface rounded-xl"
      aria-label={name || "Horario nuevo"}
    >
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del horario"
          aria-label="Nombre del horario"
          className="h-9 max-w-xs font-medium"
        />
        <span className="text-sm text-muted-foreground">
          {schedule?.cityCodes.length
            ? `Rige en ${schedule.cityCodes.join(", ")}`
            : "Sin ciudades asignadas"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {message && (
            <p
              role={message.ok ? "status" : "alert"}
              className={
                message.ok ? "text-sm text-success" : "text-sm text-destructive"
              }
            >
              {message.text}
            </p>
          )}
          {schedule && schedule.cityCodes.length === 0 && (
            <Button variant="ghost" size="sm" onClick={deactivate}>
              Desactivar
            </Button>
          )}
          <Button onClick={save} disabled={isPending}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Guardar horario
          </Button>
        </div>
      </header>
      <div className="hidden grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.4fr)] gap-4 px-4 pt-3 text-xs text-muted-foreground md:grid">
        <span />
        <span className="flex justify-between tabular-nums" aria-hidden="true">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </span>
        <span>Franjas dentro de horario</span>
      </div>
      <ul className="divide-y px-4">
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <WeekdaySlotsRow
            key={weekday}
            weekday={weekday}
            slots={slots.filter((s) => s.weekday === weekday)}
            onChange={(daySlots) =>
              setSlots([
                ...slots.filter((s) => s.weekday !== weekday),
                ...daySlots,
              ])
            }
          />
        ))}
      </ul>
    </section>
  );
}
