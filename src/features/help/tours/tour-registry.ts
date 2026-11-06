// src/features/help/tours/tour-registry.ts
// Recorridos guiados por pantalla (driver.js, decisión 2026-11-05): cada paso apunta a un elemento con
// `data-tour` (o a un rótulo accesible). REGLA: un paso cuyo elemento no se dibuja para ese rol se salta solo, así
// cada rol recorre solo lo que puede usar.

export type TourStep = {
  element?: string;
  title: string;
  description: string;
};

export type TourDefinition = { title: string; steps: TourStep[] };

const at = (name: string) => `[data-tour="${name}"]`;

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
} satisfies Record<string, TourDefinition>;

export type TourId = keyof typeof TOURS;
