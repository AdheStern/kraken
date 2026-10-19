// src/features/sla/types.ts
// Tipos de presentación de las políticas de SLA y del semáforo de un ticket (minutos enteros, fechas ISO).
import type {
  BagModality,
  SlaKind,
  SlaStatus,
  TicketPriority,
} from "@/generated/prisma/enums";

export type SlaPolicyRow = {
  modality: BagModality;
  priority: TicketPriority;
  firstResponseMinutes: number | null;
  resolutionMinutes: number | null;
  isActive: boolean;
};

export type SlaBadgeData = {
  kind: SlaKind;
  status: SlaStatus;
  elapsedMinutes: number;
  targetMinutes: number;
  dueAt: string | null;
  // POR QUÉ: se calcula en el servidor con el parámetro sla.alerta_pct, el mismo del aviso.
  isWarning: boolean;
};
