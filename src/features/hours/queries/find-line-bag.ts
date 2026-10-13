// src/features/hours/queries/find-line-bag.ts
// Bolsa visible que corresponde a una línea de CV de cualquier versión, por su linaje (AGENTS.md §2.4).
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { prisma } from "@/server/db";

// POR QUÉ: la bolsa queda enlazada a la línea de la versión aprobada vigente; una línea de otra versión del
// mismo CV la encuentra por la raíz de su linaje.
export async function findLineBagId(
  user: SessionUser,
  lineId: string,
): Promise<string | null> {
  const line = await prisma.cvLine.findUnique({
    where: { id: lineId },
    select: { id: true, originLineId: true },
  });
  if (!line) return null;
  const root = line.originLineId ?? line.id;
  const bag = await prisma.hourBag.findFirst({
    where: {
      AND: [
        scopeHourBagQuery(user),
        { cvLine: { OR: [{ id: root }, { originLineId: root }] } },
      ],
    },
    select: { id: true },
  });
  return bag?.id ?? null;
}
