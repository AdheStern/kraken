// src/features/help/manuals/general-manager.ts
// Manual del gerente general (AGENTS.md §1 Roles, §2.3 aprobación sobre el umbral, §6 tableros).
import type { Manual } from "../types";

export const GENERAL_MANAGER_MANUAL: Manual = {
  title: "Gerente general",
  summary:
    "Ves todo: ventas, operación e inventario de todas las áreas. Apruebas los CV que superan el umbral y defines las metas.",
  sections: [
    {
      heading: "Tableros",
      steps: [
        "Tableros abre Ventas; arriba eliges el periodo, el área y la ciudad.",
        "Cada cifra se compara con el periodo anterior y, si hay meta, muestra el avance.",
        "Exportar a Excel descarga exactamente lo que estás viendo, con los mismos filtros.",
      ],
      link: { href: "/tableros", label: "Abrir los tableros" },
    },
    {
      heading: "Aprobar CV sobre el umbral",
      steps: [
        "Aprobaciones lista las solicitudes pendientes con su antigüedad, monto y áreas.",
        "Abre el CV, revisa totales y margen; si es la versión 2 o más, usa Comparar versiones.",
        "Aprobar o Rechazar. Rechazar exige un comentario: la versión queda observada y el comercial corrige en una versión nueva.",
        "Los gerentes de área aprueban en paralelo; el CV se aprueba cuando aprueban todos.",
      ],
      link: { href: "/aprobaciones", label: "Ir a Aprobaciones" },
    },
    {
      heading: "Metas",
      steps: [
        "En Tableros → Metas defines la meta mensual de la empresa y la de cada área.",
        "Un trimestre o un año suma sus meses. Dejar una celda vacía quita la meta.",
      ],
      link: { href: "/tableros/metas", label: "Editar metas" },
    },
    {
      heading: "Tickets, bolsas e inventario",
      steps: [
        "Puedes crear, cerrar y reabrir cualquier ticket. Reabrir pide un motivo y mantiene las horas ya descontadas.",
        "En una bolsa, Ajustar saldo y Cerrar la bolsa exigen motivo y quedan en el libro.",
        "Los ajustes de inventario que no pediste tú los apruebas o rechazas en Inventario → Ajustes.",
      ],
    },
  ],
};
