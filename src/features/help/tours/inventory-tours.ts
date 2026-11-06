// src/features/help/tours/inventory-tours.ts
// Recorridos del inventario, el POS y el ingreso (decisión 2026-11-05).
import { at, type TourDefinition } from "./tour-types";

export const INVENTORY_TOURS = {
  inventario: {
    title: "Inventario",
    steps: [
      {
        element: '[aria-label="Almacenes"]',
        title: "Almacenes",
        description: "El stock de cada almacén y lo que va en tránsito.",
      },
      {
        element: at("inv-acciones"),
        title: "Operaciones",
        description:
          "Rastrear un serial, traspasos, ajustes, conteo físico, POS, devoluciones e ingresos, según tu rol.",
      },
    ],
  },
  pos: {
    title: "POS interno",
    steps: [
      {
        element: '[aria-label="Escanear serial o código"]',
        title: "Escanea",
        description:
          "Con el lector, escribiendo o con la cámara. «/» vuelve aquí.",
      },
      {
        element: '[aria-label="Buscar producto"]',
        title: "O toca el producto",
        description:
          "Busca (Alt+B) o filtra por tecnología y toca el mosaico. Uno con serial te deja elegir sus seriales.",
      },
      {
        element: at("pos-panel"),
        title: "La salida",
        description:
          "Revisa lo elegido, elige el destino (CV, ticket o uso interno) y confirma (Ctrl+Enter). Descarga el comprobante.",
      },
    ],
  },
  ingreso: {
    title: "Registrar ingreso",
    steps: [
      {
        element: '[aria-label="Buscar producto"]',
        title: "Elige el producto",
        description:
          "Toca su mosaico o «Producto nuevo», y carga cantidad, costo y seriales (también con la cámara).",
      },
      {
        element: at("pos-panel"),
        title: "El ingreso",
        description:
          "Las líneas con su total. Desde Excel, usa la pestaña «Pegar desde Excel».",
      },
    ],
  },
} satisfies Record<string, TourDefinition>;
