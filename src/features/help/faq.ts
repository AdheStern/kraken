// src/features/help/faq.ts
// Preguntas frecuentes comunes a todos los roles: dudas que vuelven sobre horas, CV y tickets, respondidas con las
// reglas de AGENTS.md §2 (si una regla cambia, cambia su respuesta).
import type { FaqEntry } from "./types";

export const FAQ: readonly FaqEntry[] = [
  {
    id: "horas-de-mas",
    question: "¿Por qué el ticket descontó más horas de las que trabajamos?",
    answer:
      "En una bolsa 8x5, cada minuto fuera del horario de oficina o en feriado vale doble. Además, el total del ticket se redondea hacia arriba a la media hora: 4 h 05 min se descuentan como 4 h 30 min. En 24x7 todo vale 1 a 1.",
  },
  {
    id: "bolsa-sin-saldo",
    question: "¿Qué pasa si la bolsa se queda sin horas?",
    answer:
      "El ticket sigue con la siguiente bolsa de su jerarquía. Lo que no cabe en ninguna queda como pendiente sin bolsa: no se pierde, se avisa al comercial y al gerente, y se aplica cuando el cliente tenga un CV nuevo.",
  },
  {
    id: "reabrir",
    question: "Si reabren un ticket, ¿vuelven las horas a la bolsa?",
    answer:
      "No. Lo descontado queda firme. Al volver a cerrarlo se cobra solo el trabajo nuevo, nunca más que si se hubiera cerrado una sola vez.",
  },
  {
    id: "contador",
    question:
      "¿Pierdo el tiempo si cierro la pestaña con el contador corriendo?",
    answer:
      "No. El contador guarda cada inicio y pausa con la hora del servidor y sigue corriendo. Ojo: solo tienes un contador activo; al iniciar otro, el anterior se pausa.",
  },
  {
    id: "cv-aprobado",
    question: "¿Puedo corregir un CV que ya está aprobado?",
    answer:
      "Crea una versión nueva con el motivo del cambio; el número del CV no cambia. La versión aprobada sigue vigente para horas e inventario hasta que se apruebe la nueva.",
  },
  {
    id: "aprobadores",
    question: "¿Quién aprueba mi CV?",
    answer:
      "El gerente de cada área que tiene líneas en el CV, todos a la vez. Si el total llega al umbral, también el gerente general. Si alguien lo rechaza, la versión queda observada y la corriges en una versión nueva.",
  },
  {
    id: "factor",
    question: "Puse el precio final y el factor no da exacto, ¿está mal?",
    answer:
      "No. Cuando ingresas el precio, Kraken guarda ese precio tal cual y calcula el factor con dos decimales solo como referencia, así que puede no reproducirlo.",
  },
  {
    id: "pedir-ticket",
    question: "Necesito soporte y no puedo crear tickets, ¿qué hago?",
    answer:
      "Pídelo en Mis solicitudes eligiendo el área que debe atenderte. Te avisamos cuando lo crean y en cada cambio de estado.",
    link: { href: "/solicitudes", label: "Ir a Mis solicitudes" },
  },
  {
    id: "no-veo",
    question: "No veo un CV o un ticket que debería ver, ¿por qué?",
    answer:
      "Cada rol ve lo suyo: el comercial sus CV, el gerente lo de su área, el ingeniero los tickets donde trabaja. Si te falta un rol o un área, pídelo al administrador del sistema.",
  },
];
