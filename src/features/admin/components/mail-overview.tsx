// src/features/admin/components/mail-overview.tsx
// Resumen del correo saliente: por dónde sale y cuántos esperan, salieron hoy o fallaron.
import { CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MailStatus } from "../types";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function MailOverview({ status }: { status: MailStatus }) {
  const { transport } = status;
  const Icon = transport.ready ? CircleCheck : TriangleAlert;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
      <div className="kr-surface col-span-3 flex gap-3 rounded-xl p-4 sm:col-span-1">
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            transport.ready ? "text-primary" : "text-warning",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-medium">{transport.name}</p>
          <p className="text-sm text-muted-foreground">{transport.detail}</p>
        </div>
      </div>
      <Stat
        label="En cola"
        value={status.pending}
        hint={
          status.oldestPendingAt
            ? `El más antiguo, del ${dateTime.format(new Date(status.oldestPendingAt))}`
            : "Nada esperando"
        }
      />
      <Stat label="Enviados hoy" value={status.sentToday} />
      <Stat
        label="Fallidos"
        value={status.failed.length}
        tone={status.failed.length > 0 ? "warning" : undefined}
      />
    </div>
  );
}

type StatProps = {
  label: string;
  value: number;
  hint?: string;
  tone?: "warning";
};

function Stat({ label, value, hint, tone }: StatProps) {
  return (
    <div className="kr-surface rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
