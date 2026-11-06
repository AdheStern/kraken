// src/features/help/tours/sales-tours.ts
// Recorridos de Control de Venta: listado, editor y aprobaciones (decisión 2026-11-05).
import { at, type TourDefinition } from "./tour-types";

export const SALES_TOURS = {
  "cv-lista": {
    title: "Control de Venta",
    steps: [
      {
        element: at("cv-filtros"),
        title: "Encuentra tus CV",
        description:
          "Busca por número, cliente o título y filtra por estado. «/» te lleva al buscador.",
      },
      {
        element: at("cv-lista"),
        title: "Tus Controles de Venta",
        description:
          "Cada fila abre el editor. Solo ves los CV de tu rol: los tuyos, los de tu área o los aprobados.",
      },
      {
        element: '[data-tour="nuevo-cv"]',
        title: "Nuevo CV",
        description:
          "Crea uno con ciudad, cliente y TC (Alt+N). El número se asigna al crearlo y nunca se reutiliza.",
      },
    ],
  },
  "cv-editor": {
    title: "Editor del CV",
    steps: [
      {
        element: at("cv-versiones"),
        title: "Versiones y acciones",
        description:
          "Cambia de versión, compara, exporta a Excel, renueva las líneas con vigencia o duplica el CV.",
      },
      {
        element: at("cv-cabecera"),
        title: "Cabecera",
        description:
          "Cliente, contacto, orden de compra y TC de costo y de venta. Se pliega para dar espacio a las líneas.",
      },
      {
        element: at("cv-barra"),
        title: "Líneas",
        description:
          "Agrega líneas (Alt+N), notas (Alt+M) y lotes (Alt+L), aplica un factor por tecnología, guarda (Ctrl+S) y envía a aprobación (Ctrl+Enter).",
      },
      {
        element: '[aria-label="Líneas del CV"] table',
        title: "La grilla",
        description:
          "Funciona como Excel: flechas y Enter para moverte y pegar filas copiadas. Alt+O abre el detalle de la línea.",
      },
      {
        element: at("cv-totales"),
        title: "Totales y aprobadores",
        description:
          "Totales en USD y Bs, factor global, margen y quiénes aprobarán según las áreas de las líneas.",
      },
    ],
  },
  aprobaciones: {
    title: "Aprobaciones",
    steps: [
      {
        element: at("aprob-lista"),
        title: "Lo que espera tu decisión",
        description:
          "Cada CV con su antigüedad, monto y áreas. Ábrelo para revisar, comparar con la versión anterior y aprobar o rechazar con comentario. Si pasa más de un día, Kraken te lo recuerda.",
      },
    ],
  },
  contactos: {
    title: "Contactos",
    steps: [
      {
        element: '[aria-label="Buscar contacto"]',
        title: "Busca en todos los clientes",
        description:
          "Por nombre, cargo, correo, teléfono, cliente o municipio («/» te trae aquí). Filtra por área o por quién lo atiende.",
      },
      {
        element: '[data-tour="contactos-lista"]',
        title: "Cada persona, una ficha",
        description:
          "Su nombre abre su historial de empresas: si cambió de trabajo, ahí ves dónde estuvo.",
      },
    ],
  },
} satisfies Record<string, TourDefinition>;
