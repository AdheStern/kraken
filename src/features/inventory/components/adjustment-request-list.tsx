// src/features/inventory/components/adjustment-request-list.tsx
// Solicitudes de ajuste: almacén, origen, motivo, quién la pidió y cada diferencia con su signo escrito; las
// pendientes que el usuario puede decidir llevan su botón.
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdjustmentRequestView } from "../types";
import { AdjustmentDecisionDialog } from "./adjustment-decision-dialog";
import { formatQuantity } from "./inventory-labels";

const ORIGIN_LABELS = {
  MANUAL: "Manual",
  CONTEO: "Conteo físico",
  TRASPASO: "Baja de traspaso",
} as const;
const STATUS_LABELS = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
} as const;
const STATUS_CLASSES = {
  PENDIENTE: "bg-warning/15 text-warning",
  APROBADO: "bg-success/15 text-success",
  RECHAZADO: "bg-muted text-muted-foreground",
} as const;

const date = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

function signed(delta: string): string {
  return delta.startsWith("-")
    ? `−${formatQuantity(delta.slice(1))}`
    : `+${formatQuantity(delta)}`;
}

export function AdjustmentRequestList({
  rows,
}: {
  rows: AdjustmentRequestView[];
}) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.id} className="kr-solid grid gap-3 rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1 basis-64">
              <p className="font-medium">
                {r.warehouseName} · {ORIGIN_LABELS[r.origin]}
                {r.areaName && (
                  <span className="text-muted-foreground"> · {r.areaName}</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {r.reason} · pidió {r.requestedByName} el{" "}
                {date.format(new Date(r.createdAt))}
              </p>
            </div>
            <Badge variant="secondary" className={STATUS_CLASSES[r.status]}>
              {STATUS_LABELS[r.status]}
            </Badge>
            {r.canDecide && (
              <AdjustmentDecisionDialog
                requestId={r.id}
                summary={`${r.warehouseName}: ${r.lines.map((l) => `${signed(l.delta)} ${l.productCode}`).join(", ")}`}
              />
            )}
          </div>
          <ul className="grid gap-1 text-sm">
            {r.lines.map((l, i) => (
              <li key={`${l.productCode}-${i}`} className="flex gap-3">
                <span
                  className={cn(
                    "w-16 text-right font-medium tabular-nums",
                    l.delta.startsWith("-")
                      ? "text-foreground"
                      : "text-success",
                  )}
                >
                  {signed(l.delta)}
                </span>
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs">{l.productCode}</span>{" "}
                  {l.description}
                  {l.serials.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {l.serials.join(", ")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {r.decisionComment && (
            <p className="text-sm text-muted-foreground">
              {r.decidedByName}: {r.decisionComment}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
