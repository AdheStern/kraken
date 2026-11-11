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
        "Para renovar soporte, suscripciones o licencias, abre el CV aprobado y usa Renovar (o «Renovar» en las renovaciones próximas del tablero): eliges las líneas con vigencia y nace un CV nuevo con sus precios y la vigencia del periodo siguiente. Kraken te avisa 60 y 15 días antes de que venzan.",
        "En la cabecera completa el contacto, el cliente final, la orden de compra y los TC de costo y de venta. El contacto se elige entre los registrados del cliente (Administración → Clientes) y llena nombre, correo, teléfono y dirección (la de su sucursal o, si no tiene, la general del cliente), que puedes corregir; el NIT del cliente se ve junto a su nombre. El TC oficial del BCB es solo referencia: si te desvías mucho verás un aviso.",
      ],
      link: { href: "/cv", label: "Ir a Control de Venta" },
    },
    {
      heading: "Líneas, factor y precio",
      steps: [
        "Puedes pegar filas desde Excel en la grilla. Cada línea necesita su área: de ahí salen los aprobadores. En una licencia (tipo Intangible) puedes indicar el rango de activación con el calendario de la columna antes de Observaciones; sale en el Excel dentro de Observaciones. En Observaciones, Alt+Enter agrega una línea, como en Excel. Para numerar 1.1, 1.2, el botón de sangría convierte la línea en subítem de la anterior; cada una mantiene su precio. Para resaltar una fila, el balde al final de la fila trae la paleta de Excel; el color sale igual en el Excel exportado.",
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
        "En la versión aprobada sí puedes completar, sin versión nueva, observaciones, PO#, rango de activación y seriales de las líneas, y notas, seriales y PO# del leasing: no cambian montos. Si hay una versión nueva en borrador, en aprobación u observada, el cambio también llega a ella.",
        "Comparar versiones muestra líneas agregadas, quitadas y modificadas. El Excel se exporta con la plantilla oficial.",
      ],
    },
    {
      heading: "Contactos de tus clientes",
      steps: [
        "Clientes (en el menú) abre la ficha de cada cliente con sus sucursales y sus contactos; ahí agregas un contacto nuevo y se le suman tus áreas.",
        "Ves los contactos de tus áreas. Editarlos, darlos de baja, transferirlos o exportarlos a Excel es de los gerentes, Desarrollo de Negocios y Administración: pídeselo a ellos.",
        "El directorio de contactos busca por nombre, correo, teléfono, cliente o municipio; el nombre abre su historial de empresas.",
      ],
      link: {
        href: "/clientes/contactos",
        label: "Abrir el directorio de contactos",
      },
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
