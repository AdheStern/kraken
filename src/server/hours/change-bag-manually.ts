// src/server/hours/change-bag-manually.ts
// Ajuste manual (± minutos) o cierre de una bolsa por un gerente, siempre con motivo, con su movimiento y
// aviso en la transacción recibida (AGENTS.md §2.9 "Bolsas: ajuste manual", §8 ACTIVA → CERRADA manual).
import { closingMinutes } from "@/domain/hours/closing-minutes";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { formatMinutes } from "@/lib/format-minutes";
import { canAdjustHourBag } from "@/server/authz/hour-bag-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { lockBags } from "./lock-bags";
import { loadBagAudience } from "./notify-bag-alerts";
import { postHourMovement } from "./post-hour-movement";

type Change =
  | { kind: "AJUSTE"; bagId: string; minutes: number; reason: string }
  | { kind: "CIERRE"; bagId: string; reason: string };

export async function changeBagManually(
  tx: Tx,
  user: SessionUser,
  change: Change,
): Promise<ActionResult<{ balanceMinutes: number }>> {
  const areas = await tx.hourBagArea.findMany({
    where: { bagId: change.bagId },
    select: { areaId: true },
  });
  if (areas.length === 0)
    return actionError("NOT_FOUND", "La bolsa ya no existe.");
  if (!canAdjustHourBag(user, { areaIds: areas.map((a) => a.areaId) }))
    return actionError(
      "FORBIDDEN",
      "Solo el gerente del área de la bolsa o el GG pueden ajustarla.",
    );
  const reason = change.reason.trim();
  const bag = (await lockBags(tx, [change.bagId])).get(change.bagId);
  if (!bag) return actionError("NOT_FOUND", "La bolsa ya no existe.");
  // REGLA: un contrato sin tope no tiene saldo que ajustar; solo se cierra (§2.4).
  if (change.kind === "AJUSTE" && bag.isUncapped)
    return actionError(
      "INVALID_STATE",
      "Un contrato sin tope no tiene saldo que ajustar; solo se puede cerrar.",
    );
  const minutes =
    change.kind === "AJUSTE" ? change.minutes : closingMinutes(bag);
  const posted = await postHourMovement(tx, {
    bagId: change.bagId,
    kind: "AJUSTE",
    minutes,
    actorId: user.id,
    reason: change.kind === "CIERRE" ? `Cierre manual · ${reason}` : reason,
    endAs: change.kind === "CIERRE" ? "CERRADA" : undefined,
  });

  const audience = await loadBagAudience(tx, change.bagId);
  const what =
    change.kind === "CIERRE"
      ? "cerró la bolsa"
      : `ajustó ${minutes > 0 ? "+" : ""}${formatMinutes(minutes)}`;
  await notify(tx, {
    event: change.kind === "CIERRE" ? "BOLSA_CERRADA" : "BOLSA_AJUSTADA",
    userIds: audience.userIds.filter((id) => id !== user.id),
    title: `${audience.cvCode}: ${user.name} ${what}`,
    body: `«${audience.description}» de ${audience.customerName}. Motivo: ${reason}`,
    link: `/horas/${change.bagId}`,
  });
  return actionOk({ balanceMinutes: posted.balanceAfter });
}
