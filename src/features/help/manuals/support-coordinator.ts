// src/features/help/manuals/support-coordinator.ts
// Manual del coordinador de soporte (AGENTS.md §2.6 tickets y cierre, §2.7 SLA, §2.9 permisos).
import type { Manual } from "../types";

export const SUPPORT_COORDINATOR_MANUAL: Manual = {
  title: "Coordinador de soporte",
  summary:
    "Recibes el trabajo de tu área: creas los tickets, eliges al encargado, ordenas las bolsas y cierras con el descuento de horas.",
  sections: [
    {
      heading: "Crear y asignar",
      steps: [
        "Tickets → Nuevo ticket: cliente, ciudad, área, prioridad y descripción. Un ticket es de soporte o de un proyecto.",
        "Si ya sabes qué bolsa paga el ticket, elígela al crearlo: queda como prioridad 1 y el SLA toma su modalidad (8x5 o 24x7).",
        "Asignar encargado: un solo ingeniero; él crea las subtareas y las reparte.",
        "Los proyectos (nombre, cliente, áreas y fechas) se crean en Tickets → Proyectos.",
      ],
      link: { href: "/tickets", label: "Ir a Tickets" },
    },
    {
      heading: "Bolsas del ticket",
      steps: [
        "En la pestaña Bolsas sumas o cambias las bolsas del cliente que paga el ticket y su orden: se llena la primera y luego la siguiente.",
        "Solo aparecen bolsas activas del mismo cliente cuyo alcance incluye el área o el proyecto del ticket.",
        "Un contrato por vigencia es una bolsa más: recibe el trabajo dentro de su vigencia sin descontar horas; si tiene tope, al llegar a él sigue la siguiente bolsa.",
        "El consumo proyectado te avisa antes del cierre si el saldo no alcanzará.",
      ],
    },
    {
      heading: "SLA y seguimiento",
      steps: [
        "El semáforo muestra el tiempo de primera respuesta y de resolución; en 8x5 solo corre en horario de oficina.",
        "En espera del cliente el reloj se pausa. Al 75% del plazo te llega un aviso.",
        "Tableros → Operación muestra cumplimiento de SLA, tickets abiertos y utilización de tu área.",
      ],
      link: {
        href: "/tableros/operacion",
        label: "Ver el tablero de operación",
      },
    },
    {
      heading: "Cerrar y reabrir",
      steps: [
        "Cuando el encargado lo deja en Resuelto, Cerrar ticket descuenta las horas de las bolsas en orden.",
        "No se cierra con contadores activos o en pausa: pide al ingeniero que termine el suyo.",
        "Lo que no alcanzó queda como horas pendientes sin bolsa y avisa al comercial y al gerente.",
        "Reabrir el ticket exige un motivo y revierte el descuento hasta el nuevo cierre.",
      ],
    },
  ],
};
