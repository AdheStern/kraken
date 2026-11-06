// src/features/admin/customer-guard.ts
// Primer paso de las actions de clientes y contactos: sesión vigente y el permiso que pide la acción
// (decisión 2026-11-06, §2.9). Lo usan también páginas fuera de Administración.
import { type ActionResult, actionError } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { getSessionUser } from "@/server/session";

type Guard =
  | { user: SessionUser; denied: null }
  | { user: null; denied: ActionResult<never> };

export async function guardCustomers(
  allowed: (user: SessionUser) => boolean,
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
  if (!allowed(user))
    return {
      user: null,
      denied: actionError(
        "FORBIDDEN",
        `No tienes permiso para ${what}. Pídeselo a un gerente o a Administración.`,
      ),
    };
  return { user, denied: null };
}
