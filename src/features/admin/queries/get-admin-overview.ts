// src/features/admin/queries/get-admin-overview.ts
// Cuántos registros activos tiene cada sección de la administración, para el tablero de entrada.
// LIMITACIÓN: sin alcance por usuario; son catálogos del sistema y la página filtra las secciones por permiso.
import { prisma } from "@/server/db";
import type { AdminSectionKey } from "../admin-sections";

export type AdminCounts = Partial<Record<AdminSectionKey, number>>;

export async function getAdminOverview(): Promise<AdminCounts> {
  const active = { where: { isActive: true } };
  const [
    clientes,
    proveedores,
    productos,
    areas,
    ciudades,
    almacenes,
    tecnologias,
    unidades,
    tiposServicio,
    usuarios,
    parametros,
    gruposEntra,
  ] = await Promise.all([
    prisma.customer.count(active),
    prisma.supplier.count(active),
    prisma.product.count(active),
    prisma.area.count(active),
    prisma.city.count(active),
    prisma.warehouse.count(active),
    prisma.technology.count(active),
    prisma.unit.count(active),
    prisma.serviceType.count(active),
    prisma.userProfile.count(active),
    prisma.parameter.count(),
    prisma.entraGroupRole
      .groupBy({ by: ["entraGroupId"] })
      .then((groups) => groups.length),
  ]);
  return {
    clientes,
    proveedores,
    productos,
    areas,
    ciudades,
    almacenes,
    tecnologias,
    unidades,
    "tipos-servicio": tiposServicio,
    usuarios,
    parametros,
    "grupos-entra": gruposEntra,
  };
}
