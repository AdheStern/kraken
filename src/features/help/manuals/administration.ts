// src/features/help/manuals/administration.ts
// Manual de Administración (AGENTS.md §2.9: CV aprobados, catálogo comercial, inventario y tableros).
import type { Manual } from "../types";

export const ADMINISTRATION_MANUAL: Manual = {
  title: "Administración",
  summary:
    "Consultas y exportas los CV aprobados, mantienes clientes, proveedores y productos, y controlas el inventario.",
  sections: [
    {
      heading: "CV aprobados",
      steps: [
        "Control de Venta lista los CV con una versión aprobada; ves sus costos y su margen.",
        "Solo ves las versiones aprobadas o reemplazadas, no los borradores que vengan después.",
        "Exporta cada versión al Excel de la plantilla oficial PA-PR-03-RE-01.",
      ],
      link: { href: "/cv", label: "Ir a Control de Venta" },
    },
    {
      heading: "Catálogo comercial",
      steps: [
        "Administración → Clientes: datos, NIT y contactos. Proveedores: uno por empresa; la modalidad va en la línea del CV.",
        "Productos marca los creados desde un CV o desde un ingreso «por revisar»: completa sus datos y márcalos revisados.",
      ],
      link: { href: "/admin", label: "Ir a Administración" },
    },
    {
      heading: "Inventario",
      steps: [
        "Ves el stock con costos y el kardex de cada producto, y operas como Almacén (POS, ingresos, traspasos y devoluciones).",
        "Apruebas o rechazas los ajustes que no pediste tú; rechazar exige un comentario.",
      ],
      link: { href: "/inventario", label: "Ir a Inventario" },
    },
    {
      heading: "Tableros",
      steps: [
        "Ventas e Inventario muestran las ventas aprobadas y el valor y la rotación del stock; puedes exportarlos a Excel.",
        "Las metas se consultan aquí; las definen el gerente general y los gerentes de área.",
      ],
      link: { href: "/tableros", label: "Abrir los tableros" },
    },
  ],
};
