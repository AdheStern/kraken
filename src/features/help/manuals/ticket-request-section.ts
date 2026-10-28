// src/features/help/manuals/ticket-request-section.ts
// Sección común a todos los manuales: cómo pedir un ticket y seguirlo (AGENTS.md §2.6 «Solicitudes de ticket»).
import type { ManualSection } from "../types";

export const TICKET_REQUEST_SECTION: ManualSection = {
  heading: "Pedir un ticket",
  steps: [
    "Mis solicitudes → Nueva solicitud: elige el área que debe atenderte, escribe un asunto y describe el problema (qué pasa, desde cuándo, qué ya intentaste).",
    "Un coordinador del área la revisa: crea el ticket con sus datos o la descarta con un motivo, que te llega en el aviso.",
    "Te avisamos en la campana y por correo cuando el ticket tiene encargado, cuando lo empiezan a atender, si espera tu respuesta y cuando se resuelve o se cierra.",
  ],
  link: { href: "/solicitudes", label: "Ir a Mis solicitudes" },
};
