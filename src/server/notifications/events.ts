// src/server/notifications/events.ts
// Registro de tipos de evento notificables (Registry, AGENTS.md §9). Agregar uno no toca notify().

export const NOTIFICATION_EVENTS = {
  CV_ENVIADO: "Un CV espera tu aprobación",
  CV_SOLICITUD_DECIDIDA: "Un área decidió sobre tu CV",
  CV_APROBADO: "CV aprobado",
  CV_OBSERVADO: "CV observado",
  CV_NUEVA_VERSION: "Nueva versión de un CV",
  CV_ANULADO: "CV anulado",
} as const;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;
