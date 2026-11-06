// src/features/search/actions/search-everything.ts
// Búsqueda global (Ctrl+K): valida el texto y devuelve los grupos que el usuario puede ver (decisión 2026-11-05).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { getSessionUser } from "@/server/session";
import { searchEverything as runSearch } from "../queries/search-everything";
import type { SearchGroup } from "../types";

const schema = z.string().trim().min(2).max(80);

export async function searchEverything(
  query: string,
): Promise<ActionResult<SearchGroup[]>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = schema.safeParse(query);
  if (!parsed.success) return actionOk([]);
  try {
    return actionOk(await runSearch(user, parsed.data));
  } catch (error) {
    return toActionError(error, "searchEverything");
  }
}
