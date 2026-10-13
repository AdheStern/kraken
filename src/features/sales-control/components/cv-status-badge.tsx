// src/features/sales-control/components/cv-status-badge.tsx
// Insignia del estado de una versión de CV (máquina de estados, AGENTS.md §8).
import { Badge } from "@/components/ui/badge";
import type { CvVersionStatus } from "@/generated/prisma/enums";

export const CV_STATUS_LABELS: Record<CvVersionStatus, string> = {
  BORRADOR: "Borrador",
  EN_APROBACION: "En aprobación",
  OBSERVADA: "Observada",
  APROBADA: "Aprobada",
  REEMPLAZADA: "Reemplazada",
  ANULADA: "Anulada",
};

const STATUS_CLASSES: Record<CvVersionStatus, string> = {
  BORRADOR: "bg-secondary text-secondary-foreground",
  EN_APROBACION: "bg-warning/15 text-warning",
  OBSERVADA: "bg-destructive/10 text-destructive",
  APROBADA: "bg-success/15 text-success",
  REEMPLAZADA: "bg-muted text-muted-foreground",
  ANULADA: "bg-muted text-muted-foreground line-through",
};

export function CvStatusBadge({ status }: { status: CvVersionStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_CLASSES[status]}>
      {CV_STATUS_LABELS[status]}
    </Badge>
  );
}
