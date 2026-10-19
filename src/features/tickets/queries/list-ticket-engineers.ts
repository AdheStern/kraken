// src/features/tickets/queries/list-ticket-engineers.ts
// Ingenieros activos que pueden ser encargados o asignados de subtareas de un ticket con esas áreas
// (AGENTS.md §2.6 "Un solo ingeniero encargado").
import { prisma } from "@/server/db";
import type { Person } from "../types";

export async function listTicketEngineers(
  areaIds: readonly string[],
): Promise<Person[]> {
  const roles = await prisma.userRole.findMany({
    where: {
      role: { code: "INGENIERO" },
      user: { isActive: true },
      OR: [{ areaId: null }, { areaId: { in: [...areaIds] } }],
    },
    distinct: ["userId"],
    select: {
      user: {
        select: { userId: true, user: { select: { name: true, image: true } } },
      },
    },
  });
  return roles
    .map(({ user }) => ({
      id: user.userId,
      name: user.user.name,
      image: user.user.image,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
