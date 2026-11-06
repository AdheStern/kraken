// src/components/shortcuts/shortcut-registry.ts
// Única definición de los atajos de teclado: teclas, qué hacen y su sección. La usan el proveedor, el resumen («?»)
// y la ayuda (decisión 2026-11-05). Cambiar una tecla se hace solo aquí.
// LIMITACIÓN: Alt+D, Alt+E y Alt+F no se usan: en Edge y Chrome abren la barra de direcciones y los menús; Ctrl+N,
// Ctrl+T y Ctrl+W los reserva el navegador.
import type { NavKey } from "@/components/app-shell/nav-entries";

export type ShortcutDefinition = {
  keys: string;
  description: string;
  section: string;
};

const NAV_LETTERS: Partial<Record<NavKey, [string, string]>> = {
  inicio: ["I", "Inicio"],
  tableros: ["R", "Tableros"],
  cv: ["C", "Control de Venta"],
  aprobaciones: ["A", "Aprobaciones"],
  tickets: ["T", "Tickets"],
  solicitudes: ["S", "Mis solicitudes"],
  horas: ["H", "Bolsas de horas"],
  inventario: ["N", "Inventario"],
  documentacion: ["D", "Documentación"],
  contactos: ["O", "Clientes"],
  clienteInicio: ["I", "Inicio"],
  clienteTickets: ["T", "Tickets"],
  clienteBolsas: ["H", "Bolsas de horas"],
  clienteSolicitudes: ["S", "Solicitudes"],
};

const NAV = Object.fromEntries(
  Object.entries(NAV_LETTERS).map(([key, [letter, label]]) => [
    `nav.${key}`,
    {
      keys: `G ${letter}`,
      description: `Ir a ${label}`,
      section: "Navegación",
    },
  ]),
) as Record<`nav.${NavKey}`, ShortcutDefinition>;

export const SHORTCUTS = {
  help: { keys: "?", description: "Ver todos los atajos", section: "General" },
  search: {
    keys: "Ctrl+K",
    description: "Buscar en todo Kraken",
    section: "General",
  },
  ...NAV,
  "cv.new": {
    keys: "Alt+N",
    description: "Nuevo CV",
    section: "Control de Venta",
  },
  "list.filter": {
    keys: "/",
    description: "Ir al buscador de la lista",
    section: "Listados",
  },
  "cv.addLine": {
    keys: "Alt+N",
    description: "Agregar una línea",
    section: "Editor del CV",
  },
  "cv.addNote": {
    keys: "Alt+M",
    description: "Agregar una nota",
    section: "Editor del CV",
  },
  "cv.addGroup": {
    keys: "Alt+L",
    description: "Agregar un lote",
    section: "Editor del CV",
  },
  "cv.lineDetail": {
    keys: "Alt+O",
    description: "Abrir el detalle de la línea actual",
    section: "Editor del CV",
  },
  "cv.save": {
    keys: "Ctrl+S",
    description: "Guardar las líneas",
    section: "Editor del CV",
  },
  "cv.submit": {
    keys: "Ctrl+Enter",
    description: "Enviar a aprobación",
    section: "Editor del CV",
  },
  "ticket.new": {
    keys: "Alt+N",
    description: "Nuevo ticket",
    section: "Tickets",
  },
  "ticket.timer": {
    keys: "Alt+I",
    description: "Iniciar, pausar o reanudar tu contador",
    section: "Detalle del ticket",
  },
  "ticket.comment": {
    keys: "Alt+C",
    description: "Escribir un comentario",
    section: "Detalle del ticket",
  },
  "ticket.manual": {
    keys: "Alt+R",
    description: "Cargar un registro de tiempo manual",
    section: "Detalle del ticket",
  },
  "inv.scan": {
    keys: "/",
    description: "Ir al escáner",
    section: "Inventario",
  },
  "inv.products": {
    keys: "Alt+B",
    description: "Buscar un producto",
    section: "Inventario",
  },
  "inv.confirm": {
    keys: "Ctrl+Enter",
    description: "Confirmar la salida o el traspaso",
    section: "Inventario",
  },
} satisfies Record<string, ShortcutDefinition>;

export type ShortcutId = keyof typeof SHORTCUTS;

export function navShortcutId(key: NavKey): ShortcutId | null {
  return key in NAV_LETTERS ? (`nav.${key}` as ShortcutId) : null;
}
