// src/features/tickets/components/ticket-bags-tab.tsx
// Pestaña de bolsas: consumo proyectado si se cerrara ahora, la jerarquía editable y las horas que quedaron
// sin bolsa con su aplicación (AGENTS.md §2.6 "consumo proyectado", paso 5).
import { formatMinutes } from "@/lib/format-minutes";
import type { TicketBagsPanel } from "../types";
import { BagHierarchyEditor } from "./bag-hierarchy-editor";
import { PendingHoursList } from "./pending-hours-list";

type Props = {
  ticketId: string;
  panel: TicketBagsPanel;
  canManage: boolean;
  canApplyPending: boolean;
};

export function TicketBagsTab({
  ticketId,
  panel,
  canManage,
  canApplyPending,
}: Props) {
  const { projection } = panel;
  return (
    <div className="flex flex-col gap-4">
      {projection.cityWithoutOfficeHours && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {projection.cityWithoutOfficeHours} no tiene horario de oficina: el
          ticket no se podrá cerrar y la proyección cuenta todo como fuera de
          horario. Pide al administrador del sistema que le asigne uno en
          Administración → Calendario.
        </p>
      )}
      <p className="kr-surface rounded-xl px-4 py-3 text-sm" aria-live="polite">
        Si se cerrara ahora se descontarían{" "}
        <span className="font-semibold tabular-nums">
          {formatMinutes(projection.chargedMinutes)}
        </span>{" "}
        por{" "}
        <span className="tabular-nums">
          {formatMinutes(projection.realMinutes)}
        </span>{" "}
        reales
        {projection.pendingMinutes > 0 && (
          <span className="text-warning">
            {" "}
            y quedarían{" "}
            <span className="tabular-nums">
              {formatMinutes(projection.pendingMinutes)}
            </span>{" "}
            sin bolsa
          </span>
        )}
        .
      </p>
      <BagHierarchyEditor
        key={panel.hierarchy.map((h) => h.bag.id).join()}
        ticketId={ticketId}
        hierarchy={panel.hierarchy}
        eligible={panel.eligible}
        canManage={canManage}
      />
      <PendingHoursList
        pending={panel.pending}
        bags={[...panel.hierarchy.map((h) => h.bag), ...panel.eligible].filter(
          (b) => b.status === "ACTIVA",
        )}
        canApply={canApplyPending}
      />
    </div>
  );
}
