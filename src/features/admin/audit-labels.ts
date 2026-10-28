// src/features/admin/audit-labels.ts
// Nombres en pantalla de las entidades y acciones que registra recordAudit (ADR-14).

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  "cv.cv": "CV",
  "cv.version": "Versión de CV",
  "cv.solicitud_aprobacion": "Aprobación de CV",
  "horas.bolsa": "Bolsa de horas",
  "core.cliente": "Cliente",
  "core.cliente_contacto": "Contacto de cliente",
  "core.producto": "Producto",
  "core.proveedor": "Proveedor",
  "core.area": "Área",
  "core.ciudad": "Ciudad",
  "core.tecnologia": "Tecnología",
  "core.unidad": "Unidad",
  "core.tipo_servicio": "Tipo de servicio",
  "core.feriado": "Feriado",
  "core.horario_oficina": "Horario de oficina",
  "core.usuario_perfil": "Usuario",
  "core.usuario_rol": "Roles de un usuario",
  "core.grupo_entra_rol": "Grupo de Entra ID",
  "core.parametro": "Parámetro",
  "fx.tipo_cambio": "Tipo de cambio",
  "doc.fase": "Fase de documentación",
  "doc.proyecto": "Proyecto de documentación",
  "doc.documento": "Documento",
  "tickets.solicitud": "Solicitud de ticket",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREAR: "creó",
  EDITAR: "editó",
  BAJA: "dio de baja",
  REACTIVAR: "reactivó",
  REVISAR: "dio por revisado",
  DUPLICAR: "duplicó",
  ENVIAR: "envió a aprobación",
  APROBAR: "aprobó",
  RECHAZAR: "rechazó",
  NUEVA_VERSION: "creó una versión de",
  ANULAR: "anuló",
  AJUSTAR: "ajustó",
  CERRAR: "cerró",
  ASIGNAR_ROL: "asignó un rol en",
  QUITAR_ROL: "quitó un rol en",
  SINCRONIZAR_ENTRA: "sincronizó desde Entra",
  MAPEAR: "mapeó",
  DESMAPEAR: "quitó el mapeo de",
  ASIGNAR_HORARIO: "cambió el horario de",
  CARGA_MANUAL: "cargó a mano",
  ORDENAR: "cambió el orden de",
  SUBIR: "subió",
  QUITAR: "quitó",
  DESCARTAR: "descartó",
};

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.toLowerCase();
}
