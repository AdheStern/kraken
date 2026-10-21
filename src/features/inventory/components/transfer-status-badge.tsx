// src/features/inventory/components/transfer-status-badge.tsx
// Insignia del estado de un traspaso (máquina de estados, AGENTS.md §8); el texto dice el estado, el color acompaña.
import { Badge } from "@/components/ui/badge";
import type { TransferStatusCode } from "../types";

export const TRANSFER_STATUS_LABELS: Record<TransferStatusCode, string> = {
  BORRADOR: "Borrador",
  EN_TRANSITO: "En tránsito",
  RECIBIDO: "Recibido",
  RECIBIDO_CON_DIFERENCIAS: "Con diferencias",
  CANCELADO: "Cancelado",
};

const STATUS_CLASSES: Record<TransferStatusCode, string> = {
  BORRADOR: "bg-muted text-muted-foreground",
  EN_TRANSITO: "bg-primary/10 text-primary",
  RECIBIDO: "bg-success/15 text-success",
  RECIBIDO_CON_DIFERENCIAS: "bg-warning/15 text-warning",
  CANCELADO: "bg-muted text-muted-foreground",
};

export function TransferStatusBadge({
  status,
}: {
  status: TransferStatusCode;
}) {
  return (
    <Badge variant="secondary" className={STATUS_CLASSES[status]}>
      {TRANSFER_STATUS_LABELS[status]}
    </Badge>
  );
}
