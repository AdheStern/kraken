// src/server/hours/apply-version-bags.ts
// Al aprobarse una versión abre, ajusta, re-enlaza o cierra las bolsas de horas del CV, con sus movimientos
// en la transacción de la aprobación (AGENTS.md §2.3 "al aprobarse", §2.4 y flujo de aprobación).
import type { BagOp } from "@/domain/hours/plan-version-bags";
import type { Tx } from "@/server/db";
import { findBagPlanProblem } from "./bag-plan-problem";
import { BagPlanError } from "./hour-errors";
import { lockBags } from "./lock-bags";
import { postHourMovement } from "./post-hour-movement";
import {
  findCvBagIds,
  type PlannedLine,
  planBagsForVersion,
  type VersionBagContext,
} from "./version-bag-plan";

type ApplyInput = {
  cvId: string;
  versionId: string;
  actorId: string;
  // Rótulo de la versión ("132LP-25 v2") y su motivo; explican cada movimiento en el libro.
  label: string;
  reason: string | null;
};

export type AppliedBags = { opened: number; adjusted: number; closed: number };

// TRAMPA: lanza BagPlanError en lugar de devolver un error, para revertir la decisión de aprobación entera.
export async function applyVersionBags(
  tx: Tx,
  input: ApplyInput,
): Promise<AppliedBags> {
  await lockBags(tx, await findCvBagIds(tx, input.cvId));
  const context = await planBagsForVersion(tx, input.versionId);
  const problem = findBagPlanProblem(context, null);
  if (problem) throw new BagPlanError(problem.code, problem.message);

  const applied: AppliedBags = { opened: 0, adjusted: 0, closed: 0 };
  for (const op of context.plan.ops) {
    await applyOp(tx, op, context, input);
    if (op.kind === "OPEN") applied.opened += 1;
    if (op.kind === "ADJUST" && op.deltaMinutes !== 0) applied.adjusted += 1;
    if (op.kind === "CLOSE") applied.closed += 1;
  }
  return applied;
}

async function applyOp(
  tx: Tx,
  op: BagOp,
  context: VersionBagContext,
  input: ApplyInput,
): Promise<void> {
  if (op.kind === "OPEN") return openBag(tx, op, context, input);
  if (op.kind === "ADJUST") return adjustBag(tx, op, context, input);
  if (op.kind === "RELINK") {
    await tx.hourBag.update({
      where: { id: op.bagId },
      data: { cvLineId: op.lineId },
    });
    return;
  }
  await postHourMovement(tx, {
    bagId: op.bagId,
    kind: "AJUSTE",
    minutes: op.deltaMinutes,
    actorId: input.actorId,
    reason: `${input.label} · línea quitada`,
    endAs: "CERRADA",
  });
}

async function openBag(
  tx: Tx,
  op: Extract<BagOp, { kind: "OPEN" }>,
  context: VersionBagContext,
  input: ApplyInput,
): Promise<void> {
  const line = plannedLine(context, op.lineId);
  const bag = await tx.hourBag.create({
    data: {
      ...bagAttributes(line),
      cvLineId: op.lineId,
      customerId: context.customerId,
      balanceMinutes: 0,
      areas: { create: bagAreaIds(line).map((areaId) => ({ areaId })) },
    },
    select: { id: true },
  });
  await postHourMovement(tx, {
    bagId: bag.id,
    kind: "APERTURA",
    minutes: op.minutes,
    actorId: input.actorId,
    reason: `Apertura · ${input.label}`,
  });
}

// REGLA: los atributos de la versión nueva rigen hacia adelante; los consumos hechos no se recalculan (§2.4).
async function adjustBag(
  tx: Tx,
  op: Extract<BagOp, { kind: "ADJUST" }>,
  context: VersionBagContext,
  input: ApplyInput,
): Promise<void> {
  const line = plannedLine(context, op.lineId);
  const current = await tx.hourBag.findUniqueOrThrow({
    where: { id: op.bagId },
    select: { expiresOn: true },
  });
  const expiresOn = current.expiresOn?.toISOString().slice(0, 10) ?? null;
  // POR QUÉ: con otra fecha de vencimiento, los avisos de bags.expire deben volver a salir.
  const resetWarnings =
    expiresOn !== line.spec.expiresOn
      ? { expiryWarnedAt: null, expiryDayWarnedAt: null }
      : {};
  await tx.hourBag.update({
    where: { id: op.bagId },
    data: {
      ...bagAttributes(line),
      ...resetWarnings,
      cvLineId: op.lineId,
      areas: {
        deleteMany: {},
        create: bagAreaIds(line).map((areaId) => ({ areaId })),
      },
    },
  });
  if (op.deltaMinutes === 0) return;
  await postHourMovement(tx, {
    bagId: op.bagId,
    kind: "AJUSTE",
    minutes: op.deltaMinutes,
    actorId: input.actorId,
    reason: [input.label, input.reason].filter(Boolean).join(" · "),
  });
}

function plannedLine(context: VersionBagContext, lineId: string): PlannedLine {
  const line = context.lines.get(lineId);
  if (!line) throw new Error(`Línea de horas fuera del plan: ${lineId}.`);
  return line;
}

function bagAttributes({ spec }: PlannedLine) {
  return {
    modality: spec.modality,
    scope: spec.scope,
    projectId: spec.projectId,
    expiresOn: spec.expiresOn ? new Date(spec.expiresOn) : null,
  };
}

// REGLA: con alcance AREA la bolsa es de las áreas elegidas; si no, del área de la línea, que define al
// gerente que la ve y recibe sus alertas (§2.4, §2.9).
function bagAreaIds({ spec, areaId }: PlannedLine): string[] {
  if (spec.scope === "AREA") return [...spec.areaIds];
  return areaId ? [areaId] : [];
}
