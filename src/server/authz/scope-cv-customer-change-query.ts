// src/server/authz/scope-cv-customer-change-query.ts
// CV que lista la pantalla de cambio de cliente (§2.3, decisión 2026-11-12): todos para el administrador del
// sistema, ninguno para el resto. Solo cabecera; los montos no se leen (§2.9).
import type { Prisma } from "@/generated/prisma/client";
import { canChangeCvCustomer } from "./admin-permissions";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.CvWhereInput = { id: { in: [] } };

export function scopeCvCustomerChangeQuery(
  user: SessionUser,
): Prisma.CvWhereInput {
  return canChangeCvCustomer(user) ? {} : NOTHING;
}
