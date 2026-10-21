// src/server/inventory/release-cv-reservations.ts
// Libera las reservas activas de un CV anulado (AGENTS.md §2.8, §8): lo pendiente vuelve a quedar disponible.
import type { Tx } from "@/server/db";
import { lockStocks } from "./lock-stocks";
import { postReservationMovement } from "./post-reservation-movement";

export async function releaseCvReservations(
  tx: Tx,
  { cvId, actorId, reason }: { cvId: string; actorId: string; reason: string },
): Promise<void> {
  const active = await tx.reservation.findMany({
    where: { status: "ACTIVA", cvLine: { version: { cvId } } },
    select: { id: true, warehouseId: true, productId: true },
  });
  if (active.length === 0) return;
  const locked = await lockStocks(tx, active);
  for (const reservation of active)
    await postReservationMovement(tx, locked, {
      kind: "LIBERAR",
      reservationId: reservation.id,
      actorId,
      reason,
    });
}
