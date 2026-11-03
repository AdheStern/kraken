// src/server/authz/scope-customer-hour-bag-query.ts
// Bolsas visibles para la cuenta de una empresa cliente: las de su empresa, solo si su configuración lo
// permite (AGENTS.md §2.11, `portal_ve_bolsas`).
// REGLA: todo listado del portal pasa por aquí; prohibido escribir condiciones de visibilidad a mano (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.HourBagWhereInput = { id: { in: [] } };

export function canSeeCustomerBags(user: SessionUser): boolean {
  return user.customer?.seesBags === true;
}

export function scopeCustomerHourBagQuery(
  user: SessionUser,
): Prisma.HourBagWhereInput {
  return user.customer?.seesBags
    ? { customerId: user.customer.customerId }
    : NOTHING;
}
