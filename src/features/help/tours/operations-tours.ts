// src/features/help/tours/operations-tours.ts
// Recorridos de tickets, bolsas de horas y el portal de clientes (decisión 2026-11-05).
import { at, type TourDefinition } from "./tour-types";

export const OPERATIONS_TOURS = {
  tickets: {
    title: "Tickets",
    steps: [
      {
        element: at("ticket-filtros"),
        title: "Filtros",
        description:
          "Busca por número o título («/» te lleva al buscador) y filtra por cliente, área o solo los tuyos.",
      },
      {
        element: at("ticket-tablero"),
        title: "El tablero",
        description:
          "Una columna por estado. Cada tarjeta abre el ticket con su contador, subtareas, bolsas y comentarios.",
      },
      {
        element: '[data-tour="nuevo-ticket"]',
        title: "Nuevo ticket",
        description:
          "Cliente, ciudad, áreas, prioridad y encargado (Alt+N). Puedes adjuntar archivos desde el alta.",
      },
    ],
  },
  "ticket-detalle": {
    title: "Detalle del ticket",
    steps: [
      {
        element: '[aria-label="Contador"]',
        title: "Tu contador",
        description:
          "Inicia, pausa y termina (Alt+I). La hora la pone el servidor: cerrar la pestaña no pierde tiempo.",
      },
      {
        element: at("ticket-pestanas"),
        title: "Todo el ticket",
        description:
          "Subtareas, registros de tiempo, bolsas con su consumo proyectado, comentarios (Alt+C), adjuntos e historial.",
      },
      {
        element: at("ticket-acciones"),
        title: "Estado",
        description:
          "Pásalo a en espera del cliente, resuelto, o ciérralo para descontar las horas de sus bolsas.",
      },
    ],
  },
  horas: {
    title: "Bolsas de horas",
    steps: [
      {
        element: at("bolsas-filtros"),
        title: "Filtra",
        description: "Por cliente o por estado.",
      },
      {
        element: at("bolsas-lista"),
        title: "Saldo y riesgo",
        description:
          "Primero las que pasan del umbral o vencen pronto. Cada bolsa muestra su consumo y abre su libro de movimientos.",
      },
    ],
  },
  cliente: {
    title: "Portal de clientes",
    steps: [
      {
        title: "Bienvenido",
        description:
          "Aquí sigues los tickets que DIMA atiende para tu empresa: estado, encargado, SLA y, al cerrarse, las horas descontadas.",
      },
      {
        element: at("cliente-tickets"),
        title: "Tus tickets",
        description:
          "Abre uno para ver sus comentarios y adjuntos. Cuando lo resolvamos, cuéntanos si quedaste conforme.",
      },
    ],
  },
} satisfies Record<string, TourDefinition>;
