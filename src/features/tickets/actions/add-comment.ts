// src/features/tickets/actions/add-comment.ts
// Agrega un comentario interno o público a un ticket (AGENTS.md §2.7 primera respuesta).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { addTicketComment } from "@/server/tickets/add-ticket-comment";
import {
  type AddCommentInput,
  addCommentSchema,
} from "../schemas/ticket-schemas";

export async function addComment(
  input: AddCommentInput,
): Promise<ActionResult<{ commentId: string }>> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("addComment", (tx, user) =>
    addTicketComment(tx, user, parsed.data, new Date()),
  );
}
