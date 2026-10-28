// src/features/tickets/queries/list-request-areas.ts
// Áreas activas a las que se puede pedir un ticket (AGENTS.md §2.6 «Solicitudes de ticket»; catálogo, §1).
import type { CatalogOption } from "@/components/forms/catalog-combobox";
import { prisma } from "@/server/db";

export async function listRequestAreas(): Promise<CatalogOption[]> {
  const areas = await prisma.area.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
  return areas.map((a) => ({ id: a.id, label: a.code, hint: a.name }));
}
