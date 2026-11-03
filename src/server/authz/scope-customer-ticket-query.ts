// src/server/authz/scope-customer-ticket-query.ts
// Tickets visibles para la cuenta de una empresa cliente: solo los de su empresa (AGENTS.md §2.11).
// REGLA: todo listado del portal pasa por aquí; prohibido escribir condiciones de visibilidad a mano (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.TicketWhereInput = { id: { in: [] } };

export function scopeCustomerTicketQuery(
  user: SessionUser,
): Prisma.TicketWhereInput {
  return user.customer ? { customerId: user.customer.customerId } : NOTHING;
}
