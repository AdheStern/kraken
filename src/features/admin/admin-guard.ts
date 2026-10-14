// src/features/admin/admin-guard.ts
// Primer paso de toda action de la administración: sesión vigente y permiso de la sección (§2.9).
import { type ActionResult, actionError } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { getSessionUser } from "@/server/session";
import { canManageAdminAccess } from "./admin-access";
import type { AdminAccess } from "./admin-sections";

type Guard =
  | { user: SessionUser; denied: null }
  | { user: null; denied: ActionResult<never> };

export async function guardAdmin(
  access: AdminAccess,
  what: string,
): Promise<Guard> {
  const user = await getSessionUser();
  if (!user)
    return {
      user: null,
      denied: actionError(
        "UNAUTHENTICATED",
        "Tu sesión expiró. Vuelve a iniciar sesión.",
      ),
    };
  if (!canManageAdminAccess(user, access))
    return {
      user: null,
      denied: actionError(
        "FORBIDDEN",
        `No tienes permiso para editar ${what}.`,
      ),
    };
  return { user, denied: null };
}
