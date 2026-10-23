// src/features/dashboards/queries/load-dimension-labels.ts
// Nombres legibles de las claves de un desglose (área, comercial, cliente, tecnología o ciudad). Son catálogos y
// personas ya filtrados por el alcance de los hechos; aquí solo se traducen ids.
import type { SalesDimension } from "@/domain/dashboards/sales-breakdown";
import { prisma } from "@/server/db";

export async function loadDimensionLabels(
  dimension: SalesDimension,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const where = { id: { in: [...ids] } };
  const rows = await loaders[dimension](where);
  return new Map(rows.map((row) => [row.id, row.label]));
}

type Where = { id: { in: string[] } };
type Row = { id: string; label: string };

const loaders: Record<SalesDimension, (where: Where) => Promise<Row[]>> = {
  AREA: async (where) =>
    (
      await prisma.area.findMany({ where, select: { id: true, code: true } })
    ).map((a) => ({ id: a.id, label: a.code })),
  CIUDAD: async (where) =>
    (
      await prisma.city.findMany({ where, select: { id: true, name: true } })
    ).map((c) => ({ id: c.id, label: c.name })),
  CLIENTE: async (where) =>
    (
      await prisma.customer.findMany({
        where,
        select: { id: true, name: true },
      })
    ).map((c) => ({ id: c.id, label: c.name })),
  TECNOLOGIA: async (where) =>
    (
      await prisma.technology.findMany({
        where,
        select: { id: true, name: true },
      })
    ).map((t) => ({ id: t.id, label: t.name })),
  COMERCIAL: async ({ id }) =>
    (
      await prisma.user.findMany({
        where: { id },
        select: { id: true, name: true },
      })
    ).map((u) => ({ id: u.id, label: u.name })),
};
