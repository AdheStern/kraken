// src/server/hours/post-hour-movement.ts
// Único punto que mueve el saldo de una bolsa: bloquea la fila, inserta el movimiento del libro y actualiza
// la caché del saldo y el estado, y avisa los umbrales cruzados, todo en la transacción recibida
// (AGENTS.md regla 6, §2.4 alertas, ADR-03).
import {
  type BagStatus,
  canTransitionBag,
  isTerminalBagStatus,
  nextBagStatus,
} from "@/domain/hours/bag-state-machine";
import type { HourMovementKind } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";
import { BagStateError, InsufficientBalanceError } from "./hour-errors";
import { lockBags } from "./lock-bags";
import { notifyBagAlerts } from "./notify-bag-alerts";

export type HourMovementInput = {
  bagId: string;
  kind: HourMovementKind;
  minutes: number;
  // POR QUÉ: null solo para los procesos del sistema (job de vencimiento); una persona siempre firma.
  actorId: string | null;
  ticketId?: string | null;
  reversesId?: string | null;
  reason?: string | null;
  // POR QUÉ: cerrar o vencer deja la bolsa terminal; el movimiento (aunque sea de 0 min) explica por qué.
  endAs?: Extract<BagStatus, "CERRADA" | "VENCIDA">;
};

export type PostedMovement = {
  movementId: string;
  kind: HourMovementKind;
  minutes: number;
  balanceBefore: number;
  balanceAfter: number;
  statusBefore: BagStatus;
  status: BagStatus;
};

export async function postHourMovement(
  tx: Tx,
  input: HourMovementInput,
): Promise<PostedMovement> {
  const { bagId, minutes, endAs } = input;
  if (!Number.isInteger(minutes))
    throw new RangeError("Los movimientos de horas son en minutos enteros.");
  if (minutes === 0 && !endAs)
    throw new RangeError("Un movimiento de 0 min solo registra un cierre.");
  const bag = (await lockBags(tx, [bagId])).get(bagId);
  if (!bag) throw new BagStateError("La bolsa ya no existe.");
  if (isTerminalBagStatus(bag.status))
    throw new BagStateError(
      `La bolsa está ${bag.status.toLowerCase()}; no admite movimientos.`,
    );

  const balanceAfter = bag.balanceMinutes + minutes;
  // REGLA: el saldo nunca queda negativo; el CHECK de la tabla es solo la última red (§2.4, ADR-03). En un
  // contrato sin tope el saldo es lo usado, en negativo, y nunca se agota.
  if (balanceAfter < 0 && !bag.isUncapped)
    throw new InsufficientBalanceError(bagId, bag.balanceMinutes, -minutes);
  const status = resolveStatus(bag, balanceAfter, endAs);

  const movement = await tx.hourMovement.create({
    data: {
      bagId,
      kind: input.kind,
      minutes,
      actorId: input.actorId,
      ticketId: input.ticketId ?? null,
      reversesId: input.reversesId ?? null,
      reason: input.reason ?? null,
    },
    select: { id: true },
  });
  await tx.hourBag.update({
    where: { id: bagId },
    data: { balanceMinutes: balanceAfter, status },
  });
  const posted: PostedMovement = {
    movementId: movement.id,
    kind: input.kind,
    minutes,
    balanceBefore: bag.balanceMinutes,
    balanceAfter,
    statusBefore: bag.status,
    status,
  };
  // POR QUÉ: cerrar o vencer no es consumo; esos avisos los dan el cierre y el job de vencimiento.
  if (!endAs) await notifyBagAlerts(tx, bagId, posted, input.actorId);
  return posted;
}

function resolveStatus(
  { status: current, isUncapped }: { status: BagStatus; isUncapped: boolean },
  balanceAfter: number,
  endAs: HourMovementInput["endAs"],
): BagStatus {
  if (endAs && balanceAfter !== 0 && !isUncapped)
    throw new BagStateError(
      "Para cerrar o vencer una bolsa su saldo debe quedar en 0.",
    );
  const status =
    endAs ?? (isUncapped ? current : nextBagStatus(current, balanceAfter));
  if (status !== current && !canTransitionBag(current, status))
    throw new BagStateError(`Transición inválida: ${current} → ${status}.`);
  return status;
}
