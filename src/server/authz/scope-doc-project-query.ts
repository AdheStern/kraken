// src/server/authz/scope-doc-project-query.ts
// Filtro de visibilidad de los proyectos de documentación (AGENTS.md §2.10).
// REGLA: todo listado de proyectos de documentación pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canUseDocumentation } from "./documentation-permissions";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.DocProjectWhereInput = { id: { in: [] } };

// POR QUÉ: hoy la documentación es pública (§2.10); restringirla después cambia solo esta función.
export function scopeDocProjectQuery(
  user: SessionUser,
): Prisma.DocProjectWhereInput {
  return canUseDocumentation(user) ? {} : NOTHING;
}
