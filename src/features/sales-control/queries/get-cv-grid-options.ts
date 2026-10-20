// src/features/sales-control/queries/get-cv-grid-options.ts
// Catálogos activos que usan las celdas de la grilla de líneas (áreas, proveedores, tecnologías, unidades, productos)
// y los proyectos activos del cliente del CV para el alcance de sus bolsas.
import { prisma } from "@/server/db";
import type { CvGridOptions } from "../types";

export async function getCvGridOptions(
  customerId: string,
): Promise<CvGridOptions> {
  const active = { isActive: true };
  const [areas, suppliers, technologies, units, products, projects] =
    await Promise.all([
      prisma.area.findMany({ where: active, orderBy: { code: "asc" } }),
      prisma.supplier.findMany({ where: active, orderBy: { name: "asc" } }),
      prisma.technology.findMany({ where: active, orderBy: { name: "asc" } }),
      prisma.unit.findMany({ where: active, orderBy: { code: "asc" } }),
      prisma.product.findMany({ where: active, orderBy: { code: "asc" } }),
      prisma.project.findMany({
        where: { customerId, status: "ACTIVO" },
        orderBy: { name: "asc" },
      }),
    ]);

  return {
    areas: areas.map((a) => ({ id: a.id, label: a.code, hint: a.name })),
    suppliers: suppliers.map((s) => ({ id: s.id, label: s.name })),
    technologies: technologies.map((t) => ({ id: t.id, label: t.name })),
    units: units.map((u) => ({
      id: u.id,
      label: u.code,
      hint: u.name,
      isHours: u.isHours,
    })),
    products: products.map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      technologyId: p.technologyId,
      unitId: p.unitId,
      itemType: p.itemType,
    })),
    projects: projects.map((p) => ({ id: p.id, label: p.name })),
  };
}
