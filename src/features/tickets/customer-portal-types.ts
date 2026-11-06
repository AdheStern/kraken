// src/features/tickets/customer-portal-types.ts
// Tipos de presentación del portal de clientes (AGENTS.md §2.11): solo lo que el cliente puede ver. Nunca
// registros de tiempo, subtareas, comentarios internos, bolsas por ticket ni montos.
import type {
  SlaStatus,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";

export type CustomerTicketRow = {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  ownerName: string | null;
  createdAt: string;
  closedAt: string | null;
  // Horas descontadas de sus bolsas, en minutos; 0 mientras no se cierra.
  chargedMinutes: number;
};

export type CustomerTicketDetail = CustomerTicketRow & {
  description: string;
  resolvedAt: string | null;
  sla: { kind: "PRIMERA_RESPUESTA" | "RESOLUCION"; status: SlaStatus }[];
  comments: {
    id: string;
    authorName: string;
    body: string;
    createdAt: string;
  }[];
  attachments: {
    id: string;
    fileName: string;
    sizeBytes: number;
    createdAt: string;
  }[];
  // Comenta y adjunta si su empresa lo permite y hay dónde guardar archivos (§2.11, ADR-16).
  canComment: boolean;
  filesEnabled: boolean;
  // Respuesta a la última resolución; canAnswer si está resuelto y aún no respondió (§2.11).
  conformity: {
    canAnswer: boolean;
    answer: { isSatisfied: boolean; rating: number | null } | null;
  };
};
