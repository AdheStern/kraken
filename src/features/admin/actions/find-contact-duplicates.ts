// src/features/admin/actions/find-contact-duplicates.ts
// Antes de crear un contacto: ¿ya existe esa persona, en este cliente o en otro? (decisión 2026-11-06).
"use server";

import { z } from "zod";
import {
  type ContactMatch,
  findContactMatches,
} from "@/domain/customers/contact-matching";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canCreateContacts } from "@/server/authz/contact-permissions";
import { guardCustomers } from "../customer-guard";
import { findContactCandidates } from "../queries/find-contact-candidates";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).nullable(),
  phone: z.string().trim().max(40).nullable(),
});

export async function findContactDuplicates(
  input: z.input<typeof schema>,
): Promise<ActionResult<ContactMatch[]>> {
  const { user, denied } = await guardCustomers(
    canCreateContacts,
    "crear contactos",
  );
  if (denied) return denied;
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return actionError(
      "VALIDATION",
      "Escribe al menos el nombre del contacto.",
    );
  try {
    const candidates = await findContactCandidates(user, parsed.data);
    return actionOk(findContactMatches(parsed.data, candidates));
  } catch (error) {
    return toActionError(error, "findContactDuplicates");
  }
}
