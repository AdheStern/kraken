// src/features/inventory/queries/list-area-options.ts
// Áreas activas para elegir quién aprueba un ajuste (AGENTS.md §2.8). Catálogo sin datos de terceros.
import { prisma } from "@/server/db";

export async function listAreaOptions(): Promise<
  { id: string; label: string }[]
> {
  const areas = await prisma.area.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return areas.map((a) => ({ id: a.id, label: a.name }));
}
