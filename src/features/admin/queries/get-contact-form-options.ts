// src/features/admin/queries/get-contact-form-options.ts
// Opciones del puesto de contacto: áreas activas y personas de DIMA activas que pueden atenderlo (decisión
// 2026-11-06). LIMITACIÓN: sin alcance; son catálogos y la ficha exige canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { ContactFormOptions } from "../types";

export async function getContactFormOptions(): Promise<
  Omit<ContactFormOptions, "branches" | "municipalities">
> {
  const [areas, users] = await Promise.all([
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    // REGLA: solo personas de DIMA; una cuenta del portal de clientes no atiende contactos (§2.11).
    prisma.userProfile.findMany({
      where: { isActive: true, customerId: null },
      orderBy: { user: { name: "asc" } },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  return {
    areas: areas.map((a) => ({ id: a.id, label: a.code, hint: a.name })),
    users: users.map((u) => ({
      id: u.userId,
      label: u.user.name,
      hint: u.user.email,
    })),
  };
}
