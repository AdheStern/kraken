// src/features/help/manuals/sales.ts
// Manual del comercial (AGENTS.md §2.1 CV, §2.2 factor, precio y TC, §2.3 versiones y aprobación).
import type { Manual } from "../types";

export const SALES_MANUAL: Manual = {
  title: "Comercial",
  summary:
    "Creas y editas tus Controles de Venta (CV), los envías a aprobación y sigues tus ventas y renovaciones.",
  sections: [
    {
      heading: "Crear un CV",
      steps: [
        "Control de Venta → Nuevo Control de Venta. El número (por ejemplo 132LP-26) se asigna al crearlo y nunca se reutiliza.",
        "Para los CV mensuales de licencias o Azure, abre uno anterior y usa Duplicar.",
        "En la cabecera completa el contacto, el cliente final, la orden de compra y los TC de costo y de venta. El contacto se elige entre los registrados del cliente (Administración → Clientes) y llena nombre, correo y teléfono, que puedes corregir. El TC oficial del BCB es solo referencia: si te desvías mucho verás un aviso.",
      ],
      link: { href: "/cv", label: "Ir a Control de Venta" },
    },
    {
      heading: "Líneas, factor y precio",
      steps: [
        "Puedes pegar filas desde Excel en la grilla. Cada línea necesita su área: de ahí salen los aprobadores. En Observaciones, Alt+Enter agrega una línea, como en Excel.",
        "Escribe el factor o el precio final; el otro se calcula. Con costo 0 (servicios propios) solo hay precio.",
        "Con un factor en la barra puedes aplicarlo a toda una tecnología; los lotes tienen su subtotal.",
        "Para vender horas usa la unidad HORAS y el tipo SERVICIO, y completa modalidad (8x5 o 24x7), alcance y vencimiento: al aprobarse nace la bolsa.",
        "Para vender soporte por tiempo usa MESES o AÑOS y el tipo SERVICIO, carga la vigencia (inicio y fin) y en el detalle marca «Soporte por vigencia» con su modalidad, alcance y, si hace falta, un tope de horas: los tickets del cliente lo usan sin descontar horas.",
        "Guardar líneas (Ctrl+S). El panel lateral muestra totales en USD y Bs, margen y aprobadores.",
      ],
    },
    {
      heading: "Aprobación y versiones",
      steps: [
        "Enviar a aprobación crea una solicitud por área y, sobre el umbral, otra para el gerente general. Mientras espera, la versión no se edita.",
        "Si alguien rechaza, la versión queda observada: crea una Nueva versión con motivo, corrige y vuelve a enviar.",
        "Para cambiar un CV aprobado también se crea una versión nueva; la aprobada sigue vigente hasta que se apruebe la nueva.",
        "Comparar versiones muestra líneas agregadas, quitadas y modificadas. El Excel se exporta con la plantilla oficial.",
      ],
    },
    {
      heading: "Tus cifras",
      steps: [
        "Tableros → Ventas muestra tus ventas aprobadas, tu pipeline y las renovaciones de los próximos 90 días.",
        "Si vendes con otro comercial, la venta se reparte en partes iguales.",
      ],
      link: { href: "/tableros/ventas", label: "Ver mis ventas" },
    },
  ],
};
