// src/features/help/manuals/system-admin.ts
// Manual del administrador del sistema (AGENTS.md §2.9 catálogos y usuarios, ADR-05 Entra ID, §10 secretos).
import type { Manual } from "../types";

export const SYSTEM_ADMIN_MANUAL: Manual = {
  title: "Administrador del sistema",
  summary:
    "Gestionas quién entra y con qué permisos, los catálogos de estructura y los parámetros. Por este rol no ves montos.",
  sections: [
    {
      heading: "Usuarios y permisos",
      steps: [
        "Grupos de Entra ID: cada grupo de Microsoft da un rol (y un área si corresponde). Los roles se recalculan en cada inicio de sesión.",
        "Dar de baja a alguien en Entra le corta el acceso el mismo día (la sesión dura 12 horas).",
        "Usuarios y roles: las excepciones son roles asignados a mano a una persona, aparte de los de sus grupos.",
      ],
      link: { href: "/admin/usuarios", label: "Ir a Usuarios y roles" },
    },
    {
      heading: "Estructura y calendario",
      steps: [
        "Áreas, ciudades, tecnologías, unidades y tipos de servicio son catálogos: agregar un área no requiere desplegar.",
        "Calendario de negocio: horario de oficina y feriados nacionales y departamentales de cada ciudad; ponderan las horas 8x5.",
        "Políticas de SLA por modalidad y prioridad; almacenes: uno físico por ciudad y el de tránsito.",
      ],
      link: { href: "/admin/calendario", label: "Ir al calendario" },
    },
    {
      heading: "Parámetros y tipo de cambio",
      steps: [
        "Parámetros: umbral del gerente general, desvío del TC que dispara el aviso, avisos de bolsas y redondeo de horas.",
        "Tipo de cambio: si la consulta al BCB falla, Cargar TC permite registrarlo a mano.",
      ],
      link: { href: "/admin/parametros", label: "Ir a Parámetros" },
    },
    {
      heading: "Correo y auditoría",
      steps: [
        "Correo: la cola de avisos, los que fallaron (Reintentar) y Enviarme un correo de prueba.",
        "Auditoría: quién aprobó, ajustó o cambió qué y cuándo, con su IP.",
        "La cuenta de emergencia con contraseña es solo para cuando Entra ID no responde.",
      ],
      link: { href: "/admin/auditoria", label: "Ir a Auditoría" },
    },
  ],
};
