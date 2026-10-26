// src/features/help/manuals/warehouse.ts
// Manual del almacén (AGENTS.md §2.8 inventario y POS).
import type { Manual } from "../types";

export const WAREHOUSE_MANUAL: Manual = {
  title: "Almacén",
  summary:
    "Registras lo que entra y sale de los almacenes: ingresos, salidas por el POS, traspasos entre ciudades, devoluciones, ajustes y conteos.",
  sections: [
    {
      heading: "Salidas con el POS",
      steps: [
        "Elige el almacén y escanea el serial o el código (o búscalo).",
        "Elige el destino: un CV con reserva, un ticket abierto o uso interno con su motivo.",
        "Confirmar salida y descarga el comprobante PDF (no lleva costos).",
      ],
      link: { href: "/inventario/pos", label: "Abrir el POS" },
    },
    {
      heading: "Ingresos",
      steps: [
        "Inventario → Registrar ingreso: origen (compra local, importación o inventario inicial), PO y el costo de cada línea (puede ser 0).",
        "Puedes pegar las filas desde Excel. Un código que no existe crea el producto «por revisar» para Administración.",
        "Los productos serializados entran con un serial por unidad.",
      ],
      link: {
        href: "/inventario/ingresos/nuevo",
        label: "Registrar un ingreso",
      },
    },
    {
      heading: "Traspasos",
      steps: [
        "Inventario → Traspasos → Nuevo traspaso: origen, destino y productos; al enviar, sale lo disponible y queda en tránsito.",
        "El almacén de destino marca qué llegó (cantidades y seriales) y usa Confirmar recepción; puede recibir en varias veces.",
        "Lo que no llega queda en tránsito hasta que llegue o se dé de baja con un ajuste aprobado.",
      ],
      link: { href: "/inventario/traspasos", label: "Ver traspasos" },
    },
    {
      heading: "Devoluciones, ajustes y conteo",
      steps: [
        "Devolución: busca la salida por el número de su comprobante y marca lo que vuelve; entra al costo de esa salida.",
        "Nuevo ajuste: la diferencia con signo (+3 si sobra, −2 si falta) y el motivo; entra al libro solo cuando lo aprueba otra persona.",
        "Conteo: completo (lo no contado es faltante) o parcial. Sin diferencias no pide nada; con diferencias pide el ajuste.",
      ],
      link: {
        href: "/inventario/devoluciones/nueva",
        label: "Registrar una devolución",
      },
    },
  ],
};
