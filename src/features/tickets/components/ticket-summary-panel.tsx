// src/features/tickets/components/ticket-summary-panel.tsx
// Resumen de un ticket cerrado en vista de tablero: horas trabajadas y descontadas, duración, actividad y el
// desglose por persona, subtarea y bolsa (AGENTS.md §2.6; las horas trabajadas son reales, las descontadas
// ponderadas y redondeadas).
import type { ReactNode } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { formatMinutes } from "@/lib/format-minutes";
import type { TicketSummary } from "../queries/get-ticket-summary";

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

type Bar = { id: string; label: string; minutes: number; lead?: ReactNode };

export function TicketSummaryPanel({ summary: s }: { summary: TicketSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Horas trabajadas"
          value={formatMinutes(s.realMinutes)}
          hint="Tiempo real registrado por todos"
        />
        <Tile
          label="Horas descontadas"
          value={formatMinutes(s.chargedMinutes)}
          hint="De las bolsas: ponderadas por horario y redondeadas a 30 min"
        />
        <Tile
          label="Sin bolsa"
          value={formatMinutes(s.pendingMinutes)}
          hint={
            s.pendingMinutes > 0
              ? "Pendientes de aplicar a una bolsa"
              : "Todo se descontó"
          }
        />
        <Tile
          label="Duración"
          value={
            s.durationMinutes === null ? "—" : formatMinutes(s.durationMinutes)
          }
          hint="Desde que se creó hasta el cierre"
        />
      </div>
      <p className="text-sm text-muted-foreground">{activityLine(s)}</p>
      <div className="grid gap-3 lg:grid-cols-3">
        <Breakdown
          title="Por persona"
          empty="Nadie registró tiempo."
          rows={s.people.map((p) => ({
            id: p.id,
            label: `${p.name} · ${p.entries} reg.`,
            minutes: p.minutes,
            lead: (
              <PersonAvatar
                name={p.name}
                image={p.image}
                className="size-5 text-[10px]"
              />
            ),
          }))}
        />
        <Breakdown
          title="Por subtarea"
          empty="Sin tiempo registrado."
          rows={s.bySubtask}
        />
        <Breakdown
          title="Descontado por bolsa"
          empty="No se descontó de ninguna bolsa."
          rows={s.byBag}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="kr-solid flex min-w-0 flex-col gap-1 rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="truncate text-2xl font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Breakdown({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Bar[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-2">
                {r.lead}
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <span className="font-medium tabular-nums">
                  {formatMinutes(r.minutes)}
                </span>
              </span>
              <span className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(r.minutes / max) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function activityLine(s: TicketSummary): string {
  const late =
    s.entries.late > 0 ? `, ${count(s.entries.late, "tardío", "tardíos")}` : "";
  return [
    `${count(s.entries.total, "registro", "registros")} (${count(s.entries.manual, "manual", "manuales")}${late})`,
    `${s.subtasks.done} de ${count(s.subtasks.total, "subtarea completada", "subtareas completadas")}`,
    count(s.comments, "comentario", "comentarios"),
  ].join(" · ");
}
