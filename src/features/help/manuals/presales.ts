// src/features/help/manuals/presales.ts
// Manual de la preventa (AGENTS.md §1 Roles, §2.9 "CV: ver").
import type { Manual } from "../types";

export const PRESALES_MANUAL: Manual = {
  title: "Preventa",
  summary:
    "Armas la propuesta técnica junto al comercial. Ves los Controles de Venta donde figuras como preventa.",
  sections: [
    {
      heading: "Tus CV",
      steps: [
        "Control de Venta lista los CV donde figuras como preventa, con todas sus versiones.",
        "La edición, los precios y el envío a aprobación son del comercial: coordina con él los cambios técnicos.",
        "Comparar versiones muestra qué cambió entre una versión y la siguiente.",
      ],
      link: { href: "/cv", label: "Ir a Control de Venta" },
    },
    {
      heading: "Bolsas y tickets",
      steps: [
        "Si tienes un área asignada, Bolsas de horas muestra las bolsas de esa área con su saldo y su libro.",
      ],
      link: { href: "/horas", label: "Ir a Bolsas de horas" },
    },
  ],
};
