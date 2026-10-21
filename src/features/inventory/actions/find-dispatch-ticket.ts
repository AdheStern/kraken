// src/features/inventory/actions/find-dispatch-ticket.ts
// Busca por número el ticket abierto al que el POS despacha materiales (AGENTS.md §2.8): solo número, título y
// cliente. LIMITACIÓN: Almacén no ve tickets (§2.9); esta búsqueda puntual no lista ni muestra su contenido.
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { runUserAction } from "@/server/run-user-action";
import type { DispatchTicket } from "../types";

const numberSchema = z.coerce
  .number()
  .int("Escribe el número del ticket.")
  .positive("Escribe el número del ticket.");

export async function findDispatchTicket(
  input: string,
): Promise<ActionResult<DispatchTicket>> {
  return runUserAction("findDispatchTicket", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo quien opera inventario despacha a tickets.",
      );
    const parsed = numberSchema.safeParse(input.replace(/^#/, "").trim());
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const ticket = await tx.ticket.findUnique({
      where: { number: parsed.data },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        customer: { select: { name: true } },
      },
    });
    if (!ticket || ticket.status === "CERRADO" || ticket.status === "CANCELADO")
      return actionError(
        "NOT_FOUND",
        `No hay un ticket abierto con el número ${parsed.data}.`,
      );
    return actionOk({
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      customerName: ticket.customer.name,
    });
  });
}
