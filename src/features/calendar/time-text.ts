// src/features/calendar/time-text.ts
// Conversión entre la hora "HH:MM" de los formularios y los minutos desde la medianoche de las franjas.

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

// TRAMPA: un <input type="time"> no admite 24:00; como fin de franja, "00:00" significa la medianoche
// siguiente (1440).
export function toMinuteOfDay(text: string, isEnd: boolean): number | null {
  const match = TIME.exec(text);
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return isEnd && minute === 0 ? 1440 : minute;
}

export function toTimeText(minute: number): string {
  const normalized = minute % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
