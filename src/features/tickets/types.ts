// src/features/tickets/types.ts
// Tipos de presentación de tickets (nunca entidades Prisma; tiempo en minutos enteros, fechas ISO, sin montos).
import type { BagSummary } from "@/features/hours/types";
import type {
  BagModality,
  SubtaskStatus,
  TicketKind,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";

export type Person = { id: string; name: string; image: string | null };

export type TicketCard = {
  id: string;
  number: number;
  title: string;
  kind: TicketKind;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  customerName: string;
  areaCodes: string[];
  owner: Person | null;
  updatedAt: string;
};

export type TicketFilters = {
  status?: TicketStatus;
  areaId?: string;
  customerId?: string;
  mine?: boolean;
};

export type WorkStatus = Extract<
  TicketStatus,
  "EN_PROGRESO" | "EN_ESPERA_CLIENTE" | "RESUELTO" | "CANCELADO"
>;

export type TicketPermissions = {
  viewerId: string;
  canManage: boolean;
  canClose: boolean;
  canComment: boolean;
  canLogTime: boolean;
  transitions: WorkStatus[];
};

export type TicketHeader = {
  id: string;
  number: number;
  title: string;
  description: string;
  kind: TicketKind;
  status: TicketStatus;
  priority: TicketPriority;
  slaModality: BagModality;
  customerId: string;
  customerName: string;
  cityName: string;
  projectName: string | null;
  areas: { id: string; code: string }[];
  owner: Person | null;
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
};

export type SubtaskView = {
  id: string;
  title: string;
  status: SubtaskStatus;
  assignee: Person | null;
  completedAt: string | null;
};

export type CommentView = {
  id: string;
  author: Person;
  body: string;
  isPublic: boolean;
  createdAt: string;
};

export type StatusEventView = {
  id: string;
  from: TicketStatus | null;
  to: TicketStatus;
  actorName: string;
  occurredAt: string;
};

export type TicketBagView = {
  priority: number;
  bag: BagSummary;
  projectedMinutes: number;
};

export type TicketProjection = {
  realMinutes: number;
  chargedMinutes: number;
  pendingMinutes: number;
  waivedMinutes: number;
};

export type PendingView = {
  id: string;
  insideMinutes: number;
  outsideMinutes: number;
  status: "PENDIENTE" | "APLICADA";
};

export type TicketBagsPanel = {
  hierarchy: TicketBagView[];
  eligible: BagSummary[];
  projection: TicketProjection;
  pending: PendingView[];
};

export type TicketDetail = {
  ticket: TicketHeader;
  permissions: TicketPermissions;
  subtasks: SubtaskView[];
  comments: CommentView[];
  history: StatusEventView[];
  engineers: Person[];
};
