// src/features/help/manuals/customer-portal.ts
// Manual de la cuenta de una empresa cliente en el portal (AGENTS.md §2.11).
import type { Manual } from "../types";

export const CUSTOMER_PORTAL_MANUAL: Manual = {
  title: "Cliente",
  summary:
    "Sigues los tickets que DIMA atiende para tu empresa: su estado, el encargado, el cumplimiento del SLA y las horas descontadas de tu contrato.",
  sections: [
    {
      heading: "Tus tickets",
      steps: [
        "Tickets lista los de tu empresa, abiertos y cerrados. Abre uno para ver su avance y sus comentarios públicos.",
        "Un ticket cerrado muestra las horas que se descontaron de tu contrato.",
        "Cuando DIMA lo resuelve te pregunta si quedaste conforme: califica de 1 a 5 estrellas o, si algo falta, cuéntalo y el ticket vuelve a trabajarse.",
        "Si tu empresa lo tiene habilitado, puedes pedir trabajo, comentar, adjuntar archivos y ver el saldo de tus bolsas de horas.",
      ],
      link: { href: "/cliente/tickets", label: "Abrir tus tickets" },
    },
  ],
};
