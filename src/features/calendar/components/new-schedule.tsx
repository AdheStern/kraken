// src/features/calendar/components/new-schedule.tsx
// Abre un editor vacío para crear otro horario de oficina (p. ej. una ciudad con pausa de mediodía).
"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScheduleEditor } from "./schedule-editor";

export function NewSchedule() {
  const [isOpen, setIsOpen] = useState(false);
  if (isOpen)
    return (
      <ScheduleEditor schedule={null} onCreated={() => setIsOpen(false)} />
    );
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-fit"
      onClick={() => setIsOpen(true)}
    >
      <Plus aria-hidden="true" />
      Nuevo horario
    </Button>
  );
}
