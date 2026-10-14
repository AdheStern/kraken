// src/features/hours/queries/get-version-bag-effects.ts
// Efecto que tendrá aprobar una versión en BORRADOR sobre las bolsas de su CV, con el mismo plan y las mismas
// reglas que aplicará el servidor al enviar y aprobar (AGENTS.md §2.4). API pública del módulo de horas.
// LIMITACIÓN: sin alcance propio; solo se llama desde el editor del CV, que ya filtró con scopeCvQuery.
import { toBusinessDate } from "@/domain/calendar/business-date";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { findBagPlanProblem } from "@/server/hours/bag-plan-problem";
import { planBagsForVersion } from "@/server/hours/version-bag-plan";
import { type BagEffects, summarizeBagEffects } from "../bag-effects";

export type { BagEffects };

export async function getVersionBagEffects(
  versionId: string,
): Promise<BagEffects | null> {
  const context = await planBagsForVersion(prisma, versionId);
  const closedBagIds = context.plan.ops.flatMap((op) =>
    op.kind === "CLOSE" ? [op.bagId] : [],
  );
  const closedBags = await prisma.hourBag.findMany({
    where: { id: { in: closedBagIds } },
    select: { id: true, cvLine: { select: { description: true } } },
  });
  const problem = findBagPlanProblem(
    context,
    toBusinessDate(systemClock.now()),
  );
  return summarizeBagEffects(
    context.plan,
    {
      lineDescription: (id) =>
        context.lines.get(id)?.description ?? "línea de horas",
      bagDescription: (id) =>
        closedBags.find((b) => b.id === id)?.cvLine.description ??
        "línea quitada",
    },
    problem?.message ?? null,
  );
}
