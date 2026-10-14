// src/features/calendar/components/day-bar.tsx
// Barra de 24 h de un día: los tramos rellenos son "dentro de horario" (x1); el resto cuenta fuera (x2 en 8x5).
import { cn } from "@/lib/utils";
import { toMinuteOfDay } from "../time-text";
import type { SlotView } from "../types";

const DAY = 1440;

export function DayBar({
  slots,
  isOff,
  className,
}: {
  slots: SlotView[];
  isOff?: boolean;
  className?: string;
}) {
  const windows = slots.flatMap((slot) => {
    const start = toMinuteOfDay(slot.start, false);
    const end = toMinuteOfDay(slot.end, true);
    return start !== null && end !== null && end > start
      ? [{ start, end }]
      : [];
  });
  return (
    <div
      className={cn(
        "relative h-2.5 overflow-hidden rounded-full bg-muted",
        isOff && "opacity-60",
        className,
      )}
      aria-hidden="true"
    >
      {[6, 12, 18].map((hour) => (
        <span
          key={hour}
          className="absolute inset-y-0 w-px bg-background/70"
          style={{ left: `${(hour * 60 * 100) / DAY}%` }}
        />
      ))}
      {windows.map((w) => (
        <span
          key={`${w.start}-${w.end}`}
          className="absolute inset-y-0 rounded-full bg-primary"
          style={{
            left: `${(w.start * 100) / DAY}%`,
            width: `${((w.end - w.start) * 100) / DAY}%`,
          }}
        />
      ))}
    </div>
  );
}
