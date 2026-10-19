// src/features/tickets/ticket-labels.ts
// Textos de la interfaz para estados, prioridades, tipos y modalidades de un ticket (AGENTS.md §8).
import type {
  BagModality,
  SubtaskStatus,
  TicketKind,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  NUEVO: "Nuevo",
  ASIGNADO: "Asignado",
  EN_PROGRESO: "En progreso",
  EN_ESPERA_CLIENTE: "Espera al cliente",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
};

// POR QUÉ: verbo de la acción que lleva a cada estado, para los botones del detalle.
export const TRANSITION_LABELS: Partial<Record<TicketStatus, string>> = {
  EN_PROGRESO: "Trabajar",
  EN_ESPERA_CLIENTE: "Esperar al cliente",
  RESUELTO: "Marcar resuelto",
  CANCELADO: "Cancelar ticket",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  BAJA: "bg-muted text-muted-foreground",
  MEDIA: "bg-secondary text-secondary-foreground",
  ALTA: "bg-warning/15 text-warning",
  CRITICA: "bg-destructive/10 text-destructive",
};

export const KIND_LABELS: Record<TicketKind, string> = {
  SOPORTE: "Soporte",
  PROYECTO: "Proyecto",
};

export const MODALITY_LABELS: Record<BagModality, string> = {
  H8X5: "8x5",
  H24X7: "24x7",
};

export const SUBTASK_STATUS_LABELS: Record<SubtaskStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

// POR QUÉ: el tablero junta los terminados en una sola columna; el detalle dice si se cerró o se canceló.
export const BOARD_COLUMNS: {
  key: string;
  title: string;
  statuses: TicketStatus[];
}[] = [
  { key: "nuevo", title: "Nuevos", statuses: ["NUEVO"] },
  { key: "asignado", title: "Asignados", statuses: ["ASIGNADO"] },
  { key: "progreso", title: "En progreso", statuses: ["EN_PROGRESO"] },
  {
    key: "espera",
    title: "Espera al cliente",
    statuses: ["EN_ESPERA_CLIENTE"],
  },
  { key: "resuelto", title: "Resueltos", statuses: ["RESUELTO"] },
  { key: "terminado", title: "Terminados", statuses: ["CERRADO", "CANCELADO"] },
];
