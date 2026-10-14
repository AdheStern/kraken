// src/features/admin/simple-catalogs.ts
// Catálogos simples (nombre, y a veces código, NIT o marca de horas) que comparten pantalla y acciones.
// POR QUÉ: seis catálogos casi idénticos; un registro evita seis copias de la misma pantalla (§9, DRY).
import type { AdminAccess } from "./admin-sections";

export const SIMPLE_CATALOG_KINDS = [
  "areas",
  "ciudades",
  "tecnologias",
  "unidades",
  "tipos-servicio",
  "proveedores",
] as const;

export type SimpleCatalogKind = (typeof SIMPLE_CATALOG_KINDS)[number];

export type SimpleCatalogConfig = {
  title: string;
  singular: string;
  description: string;
  access: AdminAccess;
  // POR QUÉ: el código identifica (número de CV, grupos de Entra); se fija al crear y no se edita.
  code?: { label: string; pattern: RegExp; hint: string };
  hasTaxId?: boolean;
  hasHoursFlag?: boolean;
};

export const SIMPLE_CATALOGS: Record<SimpleCatalogKind, SimpleCatalogConfig> = {
  areas: {
    title: "Áreas",
    singular: "área",
    description:
      "Las áreas de las líneas de un CV deciden quién lo aprueba. Dar de baja un área no toca los CV que ya la usan.",
    access: "system",
    code: {
      label: "Código",
      pattern: /^[A-Z][A-Z0-9]{1,19}$/,
      hint: "Mayúsculas y números, como DIMANET.",
    },
  },
  ciudades: {
    title: "Ciudades",
    singular: "ciudad",
    description:
      "Cada ciudad lleva su correlativo de CV, su horario y sus feriados. El código va en el número del CV (132LP-25).",
    access: "system",
    code: {
      label: "Código",
      pattern: /^[A-Z]{2,4}$/,
      hint: "De 2 a 4 letras mayúsculas, como LP.",
    },
  },
  tecnologias: {
    title: "Tecnologías",
    singular: "tecnología",
    description:
      "La línea principal del CV y la tecnología de cada línea; también agrupa los factores (FACTOR CISCO).",
    access: "system",
  },
  unidades: {
    title: "Unidades",
    singular: "unidad",
    description:
      "La unidad de cada línea. Una línea de servicio con una unidad de horas genera una bolsa al aprobarse.",
    access: "system",
    code: {
      label: "Código",
      pattern: /^[A-Z][A-Z0-9_]{1,19}$/,
      hint: "Mayúsculas, como HORAS.",
    },
    hasHoursFlag: true,
  },
  "tipos-servicio": {
    title: "Tipos de servicio",
    singular: "tipo de servicio",
    description: "Clasificación de la cabecera del CV.",
    access: "system",
  },
  proveedores: {
    title: "Proveedores",
    singular: "proveedor",
    description:
      "Un proveedor por empresa: «INGRAM» e «INGRAM - INT» son el mismo; la modalidad (local, importación) va en la línea.",
    access: "commercial",
    hasTaxId: true,
  },
};

export function isSimpleCatalogKind(value: string): value is SimpleCatalogKind {
  return (SIMPLE_CATALOG_KINDS as readonly string[]).includes(value);
}
