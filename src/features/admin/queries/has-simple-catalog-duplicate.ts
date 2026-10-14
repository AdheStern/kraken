// src/features/admin/queries/has-simple-catalog-duplicate.ts
// ¿Hay otro registro del catálogo con el mismo nombre, sin distinguir mayúsculas?
// POR QUÉ: el índice único distingue mayúsculas; "cisco" y "CISCO" serían dos tecnologías en los selectores.
import { prisma } from "@/server/db";
import type { SimpleCatalogKind } from "../simple-catalogs";

export async function hasSimpleCatalogDuplicate(
  kind: SimpleCatalogKind,
  name: string,
  exceptId: string | null,
): Promise<boolean> {
  const where = {
    name: { equals: name, mode: "insensitive" as const },
    ...(exceptId ? { id: { not: exceptId } } : {}),
  };
  switch (kind) {
    case "areas":
      return (await prisma.area.count({ where })) > 0;
    case "ciudades":
      return (await prisma.city.count({ where })) > 0;
    case "unidades":
      return (await prisma.unit.count({ where })) > 0;
    case "tecnologias":
      return (await prisma.technology.count({ where })) > 0;
    case "tipos-servicio":
      return (await prisma.serviceType.count({ where })) > 0;
    case "proveedores":
      return (await prisma.supplier.count({ where })) > 0;
  }
}
