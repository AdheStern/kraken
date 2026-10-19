// src/server/run-user-action.ts
// Envoltura común de una Server Action con sesión: exige usuario, corre el trabajo en una transacción y
// traduce los errores a ActionResult (AGENTS.md regla 10, §7).
import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import type { SessionUser } from "@/server/authz/roles";
import { runInTransaction, type Tx } from "@/server/db";
import { getSessionUser } from "@/server/session";

export async function runUserAction<T>(
  context: string,
  work: (tx: Tx, user: SessionUser) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  try {
    return await runInTransaction((tx) => work(tx, user));
  } catch (error) {
    return toActionError(error, context);
  }
}
