// src/features/admin/queries/get-product.ts
// Un producto para su ficha y las opciones de tecnología y unidad de su formulario.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { ProductDetail, ProductFormOptions } from "../types";

export function getProduct(id: string): Promise<ProductDetail | null> {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      description: true,
      technologyId: true,
      unitId: true,
      itemType: true,
      isSerialized: true,
      createdFromCv: true,
      isActive: true,
    },
  });
}

// POR QUÉ: incluye la opción elegida aunque esté dada de baja, para no vaciar el campo al editar.
export async function getProductFormOptions(
  current?: Pick<ProductDetail, "technologyId" | "unitId">,
): Promise<ProductFormOptions> {
  const keep = (id: string | null | undefined) =>
    id ? [{ isActive: true }, { id }] : [{ isActive: true }];
  const [technologies, units] = await Promise.all([
    prisma.technology.findMany({
      where: { OR: keep(current?.technologyId) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { OR: keep(current?.unitId) },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);
  return {
    technologies: technologies.map((t) => ({ id: t.id, label: t.name })),
    units: units.map((u) => ({ id: u.id, label: `${u.code} · ${u.name}` })),
  };
}
