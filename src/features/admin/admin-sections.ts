// src/features/admin/admin-sections.ts
// Secciones de la administración (AGENTS.md §5) agrupadas, con quién las gestiona (§2.9) y su ruta.

export type AdminAccess = "system" | "commercial";

export type AdminSectionKey =
  | "clientes"
  | "proveedores"
  | "productos"
  | "areas"
  | "ciudades"
  | "calendario"
  | "tecnologias"
  | "unidades"
  | "tipos-servicio"
  | "usuarios"
  | "parametros"
  | "tipo-cambio";

export type AdminSection = {
  key: AdminSectionKey;
  title: string;
  description: string;
  href: string;
  access: AdminAccess;
};

export type AdminGroup = { title: string; sections: AdminSection[] };

export const ADMIN_GROUPS: readonly AdminGroup[] = [
  {
    title: "Catálogo comercial",
    sections: [
      section(
        "clientes",
        "Clientes",
        "Datos, NIT y contactos de cada cliente.",
        "/admin/clientes",
        "commercial",
      ),
      section(
        "proveedores",
        "Proveedores",
        "Un proveedor por empresa; la modalidad va en la línea del CV.",
        "/admin/catalogos/proveedores",
        "commercial",
      ),
      section(
        "productos",
        "Productos",
        "Códigos del CV y del inventario, y los creados desde un CV por revisar.",
        "/admin/productos",
        "commercial",
      ),
    ],
  },
  {
    title: "Estructura",
    sections: [
      section(
        "areas",
        "Áreas",
        "Cada área aprueba la parte de los CV con sus líneas.",
        "/admin/catalogos/areas",
        "system",
      ),
      section(
        "ciudades",
        "Ciudades",
        "Correlativo de CV, horario, feriados y almacén de cada ciudad.",
        "/admin/catalogos/ciudades",
        "system",
      ),
      section(
        "calendario",
        "Calendario de negocio",
        "Horarios de oficina y feriados que ponderan las horas.",
        "/admin/calendario",
        "system",
      ),
      section(
        "tecnologias",
        "Tecnologías",
        "Línea principal del CV y tecnología de cada línea.",
        "/admin/catalogos/tecnologias",
        "system",
      ),
      section(
        "unidades",
        "Unidades",
        "Unidad de cada línea; la de horas genera bolsas.",
        "/admin/catalogos/unidades",
        "system",
      ),
      section(
        "tipos-servicio",
        "Tipos de servicio",
        "Clasificación de la cabecera del CV.",
        "/admin/catalogos/tipos-servicio",
        "system",
      ),
    ],
  },
  {
    title: "Sistema",
    sections: [
      section(
        "usuarios",
        "Usuarios y roles",
        "Quién entra, con qué roles y en qué áreas.",
        "/admin/usuarios",
        "system",
      ),
      section(
        "parametros",
        "Parámetros",
        "Umbral del GG, desvío del TC y avisos de las bolsas.",
        "/admin/parametros",
        "system",
      ),
      section(
        "tipo-cambio",
        "Tipo de cambio",
        "TC oficial del día, su historial y la carga manual.",
        "/admin/tipo-cambio",
        "system",
      ),
    ],
  },
];

function section(
  key: AdminSectionKey,
  title: string,
  description: string,
  href: string,
  access: AdminAccess,
): AdminSection {
  return { key, title, description, href, access };
}
