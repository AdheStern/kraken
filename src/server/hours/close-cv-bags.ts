// src/server/hours/close-cv-bags.ts
// Cierra las bolsas vigentes de un CV anulado con un AJUSTE por su saldo (AGENTS.md §8: anular sin consumos).
import { isTerminalBagStatus } from "@/domain/hours/bag-state-machine";
import { closingMinutes } from "@/domain/hours/closing-minutes";
import type { Tx } from "@/server/db";
import { lockBags } from "./lock-bags";
import { postHourMovement } from "./post-hour-movement";
import { findCvBagIds } from "./version-bag-plan";

export async function closeCvBags(
  tx: Tx,
  { cvId, actorId, reason }: { cvId: string; actorId: string; reason: string },
): Promise<number> {
  const locked = await lockBags(tx, await findCvBagIds(tx, cvId));
  let closed = 0;
  for (const [bagId, bag] of locked) {
    if (isTerminalBagStatus(bag.status)) continue;
    await postHourMovement(tx, {
      bagId,
      kind: "AJUSTE",
      minutes: closingMinutes(bag),
      actorId,
      reason,
      endAs: "CERRADA",
    });
    closed += 1;
  }
  return closed;
}
