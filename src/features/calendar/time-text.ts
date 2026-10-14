// src/features/calendar/time-text.ts
// Conversión entre la hora "HH:MM" de los formularios y los minutos desde la medianoche de las franjas.

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// POR QUÉ: como fin de franja, "24:00" (o "00:00") es la medianoche siguiente (1440); acepta "8:30".
export function toMinuteOfDay(text: string, isEnd: boolean): number | null {
  if (isEnd && text.trim() === "24:00") return 1440;
  const match = TIME.exec(text.trim());
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return isEnd && minute === 0 ? 1440 : minute;
}

export function toTimeText(minute: number): string {
  if (minute === 1440) return "24:00";
  const normalized = minute % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
