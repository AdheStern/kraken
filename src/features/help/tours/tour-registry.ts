// src/features/help/tours/tour-registry.ts
// Recorridos guiados por pantalla (driver.js, decisión 2026-11-05): cada paso apunta a un elemento con
// `data-tour` (o a un rótulo accesible). REGLA: un paso cuyo elemento no se dibuja para ese rol se salta solo, así
// cada rol recorre solo lo que puede usar.
import { INVENTORY_TOURS } from "./inventory-tours";
import { OPERATIONS_TOURS } from "./operations-tours";
import { SALES_TOURS } from "./sales-tours";
import { at, type TourDefinition } from "./tour-types";

export const TOURS = {
  inicio: {
    title: "Kraken en un minuto",
    steps: [
      {
        title: "Bienvenido a Kraken",
        description:
          "Un recorrido corto por lo que tienes a mano. Puedes repetirlo cuando quieras con el botón «Recorrido» o desde Ayuda.",
      },
      {
        element: '[data-sidebar="sidebar"]',
        title: "Tus módulos",
        description:
          "Solo ves los módulos de tu rol. El número junto a un módulo son pendientes tuyos (aprobaciones, ajustes, solicitudes).",
      },
      {
        element: at("buscar"),
        title: "Buscar en todo",
        description:
          "Ctrl+K busca CV por número o cliente, tickets, productos, seriales y proyectos, solo entre lo que puedes ver.",
      },
      {
        element: at("atajos"),
        title: "Atajos de teclado",
        description:
          "Pulsa «?» en cualquier pantalla para ver sus atajos. «G» y luego una letra lleva a cada módulo (G C, G T…).",
      },
      {
        element: at("avisos"),
        title: "Avisos",
        description:
          "Aprobaciones, bolsas por agotarse, renovaciones y SLA llegan aquí y a tu correo.",
      },
      {
        element: at("inicio-red"),
        title: "Tu día",
        description:
          "Lo que te toca hoy según tu rol. Cada nodo lleva a su pantalla.",
      },
    ],
  },
  tableros: {
    title: "Tableros",
    steps: [
      {
        element: '[aria-label="Tableros"]',
        title: "Tus tableros",
        description:
          "Ventas, operación, ingenieros, inventario y metas, según tu rol.",
      },
      {
        element: at("tablero-filtros"),
        title: "Periodo y filtros",
        description:
          "Cambia el periodo, el área o la ciudad. El botón de Excel exporta lo que ves.",
      },
    ],
  },
  documentacion: {
    title: "Documentación",
    steps: [
      {
        element: at("doc-lista"),
        title: "Proyectos",
        description:
          "Cada proyecto tiene una carpeta por fase con sus documentos y lecciones aprendidas, guardados en SharePoint.",
      },
    ],
  },
  ...SALES_TOURS,
  ...OPERATIONS_TOURS,
  ...INVENTORY_TOURS,
} satisfies Record<string, TourDefinition>;

export type TourId = keyof typeof TOURS;
