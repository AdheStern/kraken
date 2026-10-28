// src/features/help/manuals/engineer.ts
// Manual del ingeniero (AGENTS.md §2.5 multiplicador, §2.6 tiempos y descuento, §2.7 SLA).
import type { Manual } from "../types";

export const ENGINEER_MANUAL: Manual = {
  title: "Ingeniero",
  summary:
    "Registras el tiempo de tus tickets y subtareas. Si eres el encargado, organizas el trabajo y dejas el ticket resuelto.",
  sections: [
    {
      heading: "Registrar tiempo con el contador",
      steps: [
        "El ticket tiene su contador arriba y cada subtarea tuya el suyo, en la pestaña Subtareas. Tu contador abierto se ve siempre en la barra superior.",
        "Iniciar, Pausar, Reanudar y Terminar. La hora la pone el servidor: cerrar la pestaña no pierde tiempo.",
        "Solo puedes tener un contador corriendo: al iniciar otro, el anterior se pausa solo. Si queda abierto más de 10 horas, te llega un aviso.",
      ],
      link: { href: "/tickets", label: "Ir a mis tickets" },
    },
    {
      heading: "Registro manual",
      steps: [
        "Si no usaste el contador, en la pestaña Registros cargas inicio y fin al terminar («Ahora» pone la hora actual). No puede solaparse con otro registro tuyo.",
        "Si lo cargas más de 48 horas después, queda marcado como tardío: registra el mismo día.",
      ],
    },
    {
      heading: "Cómo se descuentan las horas",
      steps: [
        "En una bolsa 8x5, el tiempo fuera del horario de oficina o en feriado cuenta doble; en 24x7, todo cuenta igual.",
        "Vale el horario de la ciudad del ticket, no el tuyo.",
        "Al cerrar el ticket, el total se redondea hacia arriba a múltiplos de 30 minutos.",
      ],
    },
    {
      heading: "Si eres el encargado",
      steps: [
        "Crea subtareas y asígnalas. En la pestaña Bolsas ordenas qué bolsa se consume primero y ves el consumo proyectado.",
        "Comenta en el ticket y sube adjuntos de hasta 20 MB. Materiales muestra lo que Almacén despachó al ticket.",
        "Marcar resuelto cuando termina el trabajo; el coordinador o el gerente lo cierra.",
        "El semáforo de SLA indica cuánto tiempo queda para responder y resolver.",
      ],
    },
  ],
};
