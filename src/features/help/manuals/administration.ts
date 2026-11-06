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
        "En la versión aprobada vigente completas observaciones, PO#, rango de activación y seriales de las líneas, y notas y PO# del leasing; guarda con el botón de la grilla o Ctrl+S.",
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
      heading: "Clientes y contactos",
      steps: [
        "La ficha del cliente tiene pestañas: Datos (rubro, tipo de empresa y municipio), Sucursales y Contactos.",
        "Al agregar un contacto, Kraken avisa si esa persona ya existe en este cliente o en otro: transfiérela o agrégale el puesto, así su historial queda en una sola ficha.",
        "Si alguien cambia de empresa, usa «Transferir» en su fila: su puesto aquí queda cerrado con fecha y motivo, y empieza en la nueva empresa con su nuevo cargo, correo y teléfono.",
        "Contactos (en el menú) busca en todos los clientes y exporta a Excel exactamente lo que ves; el nombre abre su historial de empresas.",
      ],
      link: {
        href: "/clientes/contactos",
        label: "Abrir el directorio de contactos",
      },
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
