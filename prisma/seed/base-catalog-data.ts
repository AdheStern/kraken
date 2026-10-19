// prisma/seed/base-catalog-data.ts
// Catálogos base reales con que arranca el sistema: ciudades y áreas de AGENTS.md §1, y unidades, tecnologías
// y tipos de servicio de la hoja "Listas" de las plantillas de CV (idéntica en las 14 plantillas que la traen).

// POR QUÉ: se omiten "Ninguno" (marcador de celda vacía), el área "Otro / Externo" (sin gerente, su aprobación
// quedaría pendiente para siempre) y las listas de personas (los usuarios entran por Entra ID).
export const CITIES = [
  { code: "LP", name: "La Paz" },
  { code: "SC", name: "Santa Cruz" },
  { code: "CB", name: "Cochabamba" },
];

export const AREAS = [
  { code: "DIMASOFT", name: "Software y licenciamiento" },
  { code: "DIMANET", name: "Redes, infraestructura y seguridad" },
  { code: "DIMATEL", name: "Comunicaciones y colaboración" },
  { code: "DIMADOC", name: "Gestión documental e impresión" },
  { code: "DIMAHELP", name: "Mesa de ayuda" },
];

export const UNITS = [
  { code: "GLOBAL", name: "Global", isHours: false },
  { code: "HORAS", name: "Horas", isHours: true },
  { code: "MESES", name: "Meses", isHours: false },
  { code: "METROS", name: "Metros", isHours: false },
  { code: "PIEZA", name: "Pieza", isHours: false },
  { code: "ROLLO", name: "Rollo", isHours: false },
  { code: "UNIDAD", name: "Unidad", isHours: false },
];

// POR QUÉ: los nombres van tal como están en la hoja ("KAPERSKY" incluido); el administrador los corrige en el catálogo.
export const TECHNOLOGIES = [
  "ACENTRIA",
  "ADOBE",
  "ALCATEL-LUCENT",
  "ARUBA NETWORKS",
  "AUTODESK",
  "CISCO",
  "EQUITRAC",
  "FORTINET",
  "HEWLETT PACKARD ENTERPRISE",
  "HEWLETT PACKARD inc.",
  "KAPERSKY",
  "MCAFEE",
  "MICROSOFT",
  "OTRA TECNOLOGIA",
  "RADWARE",
  "REDHAT",
  "RICOH",
  "VMWARE",
];

// POR QUÉ: única corrección a la hoja: "Instalacíón" llevaba una tilde de más.
export const SERVICE_TYPES = [
  "Servicios de Soporte, Mantenimiento y Garantías",
  "Servicios y Proyectos de Instalación y Configuración",
  "Contratos de Outsourcing (mensual)",
];

// [CONFIRMAR] valores iniciales pendientes de DIMA (AGENTS.md §14, F1); se editan en /admin/parametros.
export const PARAMETERS = [
  {
    key: "cv.umbral_gg_usd",
    value: "50000.00",
    description: "Total de venta (USD) desde el que aprueba también el GG",
  },
  {
    key: "fx.desvio_max_pct",
    value: "2",
    description:
      "% de desvío del TC ingresado frente al oficial que dispara la advertencia",
  },
  {
    key: "horas.alerta_consumo_pct",
    value: [80, 100],
    description: "% de consumo de una bolsa que dispara un aviso (lista)",
  },
  {
    key: "horas.aviso_vencimiento_dias",
    value: 30,
    description: "Días antes del vencimiento de una bolsa en que se avisa",
  },
  {
    key: "horas.redondeo_minutos",
    value: 30,
    description:
      "Múltiplo de minutos al que sube el total ponderado de un ticket al cerrarlo [CONFIRMAR]",
  },
];
