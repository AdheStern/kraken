// src/features/admin/queries/list-simple-catalog.ts
// Registros de un catálogo simple, activos e inactivos, en la forma común de la pantalla.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con el permiso del catálogo.
import { prisma } from "@/server/db";
import type { SimpleCatalogKind } from "../simple-catalogs";
import type { SimpleCatalogItem } from "../types";

const byName = { orderBy: { name: "asc" as const } };
const byCode = { orderBy: { code: "asc" as const } };

export async function listSimpleCatalog(
  kind: SimpleCatalogKind,
): Promise<SimpleCatalogItem[]> {
  switch (kind) {
    case "areas":
      return (await prisma.area.findMany(byCode)).map((r) => item(r, r));
    case "ciudades":
      return (await prisma.city.findMany(byCode)).map((r) => item(r, r));
    case "unidades":
      return (await prisma.unit.findMany(byCode)).map((r) => item(r, r));
    case "tecnologias":
      return (await prisma.technology.findMany(byName)).map((r) => item(r));
    case "tipos-servicio":
      return (await prisma.serviceType.findMany(byName)).map((r) => item(r));
    case "proveedores":
      return (await prisma.supplier.findMany(byName)).map((r) => item(r, r));
  }
}

type Extra = { code?: string; taxId?: string | null; isHours?: boolean };

function item(
  row: { id: string; name: string; isActive: boolean },
  extra: Extra = {},
): SimpleCatalogItem {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    code: extra.code ?? null,
    taxId: extra.taxId ?? null,
    isHours: extra.isHours ?? null,
  };
}
