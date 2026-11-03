// src/features/dashboards/components/engineer-tickets-table.tsx
// Tickets de un ingeniero en el periodo: su rol, su tiempo, lo descontado del ticket y si salió del SLA; cada uno
// abre su detalle (AGENTS.md §6). Sin montos.
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import type { EngineerTicketRow } from "../types";

// POR QUÉ: los textos del ticket son del módulo de tickets; aquí se repiten para no importar sus internos (§9).
const STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  ASIGNADO: "Asignado",
  EN_PROGRESO: "En progreso",
  EN_ESPERA_CLIENTE: "Espera al cliente",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
};

const shortDate = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

const ROLE_LABELS: Record<EngineerTicketRow["role"], string> = {
  ENCARGADO: "Encargado",
  SUBTAREA: "Subtarea",
  COLABORADOR: "Colaboró",
};

export function EngineerTicketsTable({
  tickets,
}: {
  tickets: EngineerTicketRow[];
}) {
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <h2 className="text-sm font-medium">Sus tickets en el periodo</h2>
      {tickets.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No tuvo tickets a cargo ni registró tiempo en este periodo. Prueba con
          otro mes o trimestre.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Ticket</th>
                <th className="py-2 font-medium">Cliente</th>
                <th className="py-2 font-medium">Estado</th>
                <th className="py-2 font-medium">Rol</th>
                <th className="py-2 text-right font-medium">Su tiempo</th>
                <th className="py-2 text-right font-medium">Descontado</th>
                <th className="py-2 text-right font-medium">Abierto</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="max-w-72 truncate py-2 pr-3">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="text-primary hover:underline"
                    >
                      #{t.number} {t.title}
                    </Link>
                    {t.slaMissed && (
                      <span className="ml-2 rounded-full bg-destructive/10 px-1.5 text-xs text-destructive">
                        SLA vencido
                      </span>
                    )}
                  </td>
                  <td className="max-w-48 truncate py-2 pr-3">
                    {t.customerName}
                  </td>
                  <td className="py-2 pr-3">
                    {STATUS_LABELS[t.status] ?? t.status}
                  </td>
                  <td className="py-2 pr-3">{ROLE_LABELS[t.role]}</td>
                  <td className="py-2 text-right">
                    {formatMinutes(t.myMinutes)}
                  </td>
                  <td className="py-2 text-right">
                    {t.closedAt ? formatMinutes(t.chargedMinutes) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {shortDate.format(new Date(t.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
