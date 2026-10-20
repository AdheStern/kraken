// src/features/tickets/types.ts
// Tipos de presentación de tickets (nunca entidades Prisma; tiempo en minutos enteros, fechas ISO, sin montos).
import type { BagSummary } from "@/features/hours/types";
import type { SlaBadgeData } from "@/features/sla/types";
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
  projectId: string | null;
  customerId: string;
  customerName: string;
  areaCodes: string[];
  owner: Person | null;
  updatedAt: string;
  sla: SlaBadgeData | null;
  // POR QUÉ: las transiciones que el usuario puede hacer desde el tablero; el servidor vuelve a validarlas (§8).
  transitions: WorkStatus[];
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
  sla: SlaBadgeData[];
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

export type AttachmentView = {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  canDelete: boolean;
};

export type TicketDetail = {
  ticket: TicketHeader;
  permissions: TicketPermissions;
  subtasks: SubtaskView[];
  comments: CommentView[];
  history: StatusEventView[];
  engineers: Person[];
  attachments: AttachmentView[];
  // POR QUÉ: sin almacén configurado la pestaña lo dice en lugar de fallar al subir (ADR-16).
  filesEnabled: boolean;
};

export type ProjectView = {
  id: string;
  name: string;
  status: "ACTIVO" | "CERRADO";
  customerName: string;
  areaCodes: string[];
  startsOn: string | null;
  endsOn: string | null;
  openTickets: number;
  bags: number;
  canManage: boolean;
};

export type TimerView = {
  timerId: string;
  status: "CORRIENDO" | "PAUSADO";
  // POR QUÉ: lo acumulado sin el tramo en curso; el navegador suma desde runningSince para avanzar cada segundo.
  closedMs: number;
  runningSince: string | null;
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  subtaskTitle: string | null;
};

export type TimeEntryView = {
  id: string;
  person: Person;
  subtaskTitle: string | null;
  startedAt: string;
  endedAt: string | null;
  minutes: number | null;
  source: "CONTADOR" | "MANUAL";
  isLate: boolean;
  canDelete: boolean;
};

export type TicketTime = {
  entries: TimeEntryView[];
  timers: TimerView[];
  targets: { id: string | null; label: string }[];
};
