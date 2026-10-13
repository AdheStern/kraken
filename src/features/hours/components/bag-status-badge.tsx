// src/features/hours/components/bag-status-badge.tsx
// Insignia del estado de una bolsa (máquina de estados, AGENTS.md §8).
import { Badge } from "@/components/ui/badge";
import type { BagStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "./bag-labels";

const STATUS_CLASSES: Record<BagStatus, string> = {
  ACTIVA: "bg-success/15 text-success",
  AGOTADA: "bg-destructive/10 text-destructive",
  VENCIDA: "bg-muted text-muted-foreground",
  CERRADA: "bg-muted text-muted-foreground",
};

export function BagStatusBadge({ status }: { status: BagStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
