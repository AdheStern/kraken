// src/server/notifications/events.ts
// Registro de tipos de evento notificables (Registry, AGENTS.md §9). Agregar uno no toca notify().

export const NOTIFICATION_EVENTS = {
  CV_ENVIADO: "Un CV espera tu aprobación",
  CV_SOLICITUD_DECIDIDA: "Un área decidió sobre tu CV",
  CV_APROBADO: "CV aprobado",
  CV_OBSERVADO: "CV observado",
  CV_NUEVA_VERSION: "Nueva versión de un CV",
  CV_ANULADO: "CV anulado",
  BOLSA_UMBRAL: "Una bolsa de horas superó un umbral de consumo",
  BOLSA_AGOTADA: "Una bolsa de horas se agotó",
  BOLSA_AJUSTADA: "Ajuste manual de una bolsa de horas",
  BOLSA_CERRADA: "Una bolsa de horas se cerró",
  BOLSA_POR_VENCER: "Una bolsa de horas está por vencer",
  BOLSA_VENCIDA: "Una bolsa de horas venció",
  BOLSA_PROYECCION: "El trabajo de un ticket supera el saldo de su bolsa",
  HORAS_PENDIENTES: "Horas de un ticket sin bolsa",
  RESERVA_FALTANTE: "Una reserva de stock no tiene stock suficiente",
  RESERVA_RECORTADA: "Un CV pide menos de lo ya despachado",
  RESERVA_SIN_ALMACEN: "Un CV aprobado no pudo reservar stock",
  TRASPASO_ENVIADO: "Un traspaso de inventario va en camino",
  TRASPASO_CON_DIFERENCIAS: "Un traspaso llegó con diferencias",
  AJUSTE_SOLICITADO: "Un ajuste de inventario espera tu decisión",
  AJUSTE_DECIDIDO: "Se decidió tu ajuste de inventario",
  TICKET_ASIGNADO: "Te asignaron un ticket o una subtarea",
  CONTADOR_OLVIDADO: "Un contador lleva más de 10 h corriendo",
  SLA_ALERTA: "Un ticket se acerca a su SLA o lo superó",
  SISTEMA_CORREO_FALLIDO: "Un correo no se pudo enviar",
  SISTEMA_CORREO_PRUEBA: "Correo de prueba",
} as const;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;
