// src/features/help/manuals/area-manager.ts
// Manual del gerente de área (AGENTS.md §1 Roles, §2.3 aprobación, §2.6 cierre de tickets, §2.9 permisos).
import type { Manual } from "../types";

export const AREA_MANAGER_MANUAL: Manual = {
  title: "Gerente de área",
  summary:
    "Apruebas la parte de tu área en cada CV y gestionas los tickets, las bolsas y los ajustes de inventario de tu área.",
  sections: [
    {
      heading: "Aprobar CV",
      steps: [
        "Aprobaciones muestra las solicitudes de tu área con su antigüedad; Inicio también te las recuerda.",
        "El detalle resalta las líneas de tu área. Ves los costos y el margen de todo el CV.",
        "Aprobar o Rechazar con comentario. No hay delegación: si no estás, la solicitud espera.",
        "Cada versión tiene su propio ciclo: en una versión nueva vuelves a aprobar.",
      ],
      link: { href: "/aprobaciones", label: "Ir a Aprobaciones" },
    },
    {
      heading: "Tickets de tu área",
      steps: [
        "Tickets → Nuevo ticket: cliente, ciudad, área, prioridad y descripción; opcionalmente la bolsa que lo paga, de la que el SLA toma su modalidad. Luego asignas un encargado.",
        "El encargado deja el ticket en Resuelto; tú lo cierras con Cerrar ticket, que descuenta las horas de las bolsas.",
        "No se puede cerrar con contadores activos o en pausa.",
        "Reabrir el ticket pide un motivo y revierte el descuento; se recalcula al volver a cerrarlo.",
      ],
      link: { href: "/tickets", label: "Ir a Tickets" },
    },
    {
      heading: "Bolsas de horas",
      steps: [
        "Bolsas de horas lista primero las que están en riesgo (más del 80% consumido o por vencer).",
        "Ajustar saldo y Cerrar la bolsa exigen un motivo; quedan en el libro de la bolsa.",
        "Las horas de un ticket que no alcanzaron bolsa se aplican desde su pestaña Bolsas cuando el cliente tenga saldo.",
      ],
      link: { href: "/horas", label: "Ir a Bolsas de horas" },
    },
    {
      heading: "Inventario y metas",
      steps: [
        "En Inventario → Ajustes apruebas o rechazas los ajustes de tu área (nunca uno que pediste tú).",
        "En Tableros → Metas defines la meta mensual de tus áreas.",
      ],
      link: { href: "/inventario/ajustes", label: "Ver ajustes pendientes" },
    },
  ],
};
