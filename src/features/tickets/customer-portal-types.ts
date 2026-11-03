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
};
