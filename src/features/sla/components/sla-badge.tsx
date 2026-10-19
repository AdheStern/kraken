// src/features/sla/components/sla-badge.tsx
// Semáforo del SLA de un ticket: estado y tiempo restante en texto, con el color de estado (nunca solo color;
// el coral es de la mascota, DESIGN.md). AGENTS.md §5 "SLA restante (semáforo)".
import { formatMinutes } from "@/lib/format-minutes";
import { cn } from "@/lib/utils";
import type { SlaBadgeData } from "../types";

const KIND = {
  PRIMERA_RESPUESTA: "Respuesta",
  RESOLUCION: "Resolución",
} as const;

export function SlaBadge({
  sla,
  className,
}: {
  sla: SlaBadgeData;
  className?: string;
}) {
  const remaining = sla.targetMinutes - sla.elapsedMinutes;
  const [tone, text] =
    sla.status === "CUMPLIDO"
      ? ["text-success", "cumplida"]
      : sla.status === "INCUMPLIDO"
        ? [
            "text-destructive",
            `vencida hace ${formatMinutes(Math.max(0, -remaining))}`,
          ]
        : sla.status === "PAUSADO"
          ? [
              "text-muted-foreground",
              `en pausa · quedan ${formatMinutes(remaining)}`,
            ]
          : [
              sla.isWarning ? "text-warning" : "text-success",
              `quedan ${formatMinutes(remaining)}`,
            ];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full bg-current", tone)}
      />
      <span>
        <span className="font-medium">{KIND[sla.kind]}</span>{" "}
        <span className={tone}>{text}</span>
      </span>
    </span>
  );
}
