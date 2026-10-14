// src/features/sales-control/components/versions/approval-panel.tsx
// Solicitudes de aprobación de la versión: estado por área (+GG), quién decidió y el comentario.
// Quien puede decidir ve Aprobar y Rechazar; el rechazo pide comentario (AGENTS.md §2.3).
"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApprovalStatus } from "@/generated/prisma/enums";
import { decideApproval } from "../../actions/decide-approval";
import type { CvApprovalItem } from "../../types";
import { ReasonDialog } from "./reason-dialog";

const STATUS: Record<ApprovalStatus, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-warning/15 text-warning" },
  APROBADA: { label: "Aprobada", className: "bg-success/15 text-success" },
  RECHAZADA: {
    label: "Rechazada",
    className: "bg-destructive/10 text-destructive",
  },
  CERRADA: { label: "Cerrada", className: "bg-muted text-muted-foreground" },
};

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function ApprovalPanel({ approvals }: { approvals: CvApprovalItem[] }) {
  const router = useRouter();
  if (approvals.length === 0) return null;

  return (
    <section className="kr-surface rounded-xl" aria-label="Aprobaciones">
      <h2 className="border-b px-5 py-3 text-sm font-semibold">Aprobaciones</h2>
      <ul className="divide-y">
        {approvals.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3"
          >
            <span className="text-sm font-medium">{item.label}</span>
            <Badge
              variant="secondary"
              className={STATUS[item.status].className}
            >
              {STATUS[item.status].label}
            </Badge>
            {item.decidedByName && item.decidedAt && (
              <span className="text-xs text-muted-foreground">
                {item.decidedByName} ·{" "}
                {dateTime.format(new Date(item.decidedAt))}
              </span>
            )}
            {item.canDecide && (
              <div className="ml-auto flex gap-2">
                <ReasonDialog
                  trigger={
                    <Button size="sm">
                      <Check aria-hidden="true" />
                      Aprobar
                    </Button>
                  }
                  title={`Aprobar como ${item.label}`}
                  description="Tu aprobación queda registrada con fecha y hora. El comentario es opcional."
                  label="Comentario"
                  confirmLabel="Aprobar"
                  required={false}
                  onConfirm={(comment) =>
                    decideApproval({
                      requestId: item.id,
                      decision: "APROBADA",
                      comment,
                    })
                  }
                  onDone={() => router.refresh()}
                />
                <ReasonDialog
                  trigger={
                    <Button size="sm" variant="destructive">
                      <X aria-hidden="true" />
                      Rechazar
                    </Button>
                  }
                  title={`Rechazar como ${item.label}`}
                  description="La versión queda observada y se cierran las solicitudes pendientes. El comercial corrige en una versión nueva."
                  label="Motivo del rechazo"
                  confirmLabel="Rechazar"
                  required
                  destructive
                  onConfirm={(comment) =>
                    decideApproval({
                      requestId: item.id,
                      decision: "RECHAZADA",
                      comment,
                    })
                  }
                  onDone={() => router.refresh()}
                />
              </div>
            )}
            {item.comment && (
              <p className="basis-full text-sm text-muted-foreground">
                «{item.comment}»
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
