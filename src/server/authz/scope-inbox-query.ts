// src/server/authz/scope-inbox-query.ts
// Avisos de la bandeja visibles para el usuario: solo los suyos (AGENTS.md §7, notificaciones).
// REGLA: todo listado o marcado de la bandeja pasa por este filtro (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "./roles";

export function scopeInboxQuery(user: SessionUser): Prisma.InboxItemWhereInput {
  return { userId: user.id };
}
