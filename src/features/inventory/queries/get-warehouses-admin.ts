// src/features/inventory/queries/get-warehouses-admin.ts
// Almacenes para la administración (AGENTS.md §2.8): todos, con su ciudad y cuántos productos tienen stock, y
// las ciudades activas para el selector. Sin montos: el administrador del sistema no los ve (§2.9).
import { prisma } from "@/server/db";
import type { CityOption, WarehouseAdminView } from "../types";

export async function getWarehousesAdmin(): Promise<{
  warehouses: WarehouseAdminView[];
  cities: CityOption[];
}> {
  const [warehouses, cities] = await Promise.all([
    prisma.warehouse.findMany({
      orderBy: [{ kind: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        kind: true,
        cityId: true,
        isActive: true,
        city: { select: { name: true } },
        _count: { select: { stocks: { where: { quantity: { gt: 0 } } } } },
      },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);
  return {
    warehouses: warehouses.map(({ city, _count, ...w }) => ({
      ...w,
      cityName: city?.name ?? null,
      productsInStock: _count.stocks,
    })),
    cities,
  };
}
