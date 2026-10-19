// src/features/tickets/components/comments-panel.tsx
// Comentarios del ticket: internos o públicos (el primero público del encargado es su primera respuesta del
// SLA, AGENTS.md §2.7), del más reciente al más antiguo.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "../actions/add-comment";
import type { CommentView } from "../types";
import { formatDateTime } from "./ticket-dates";
import { useTicketAction } from "./use-ticket-action";

type Props = { ticketId: string; comments: CommentView[]; canComment: boolean };

export function CommentsPanel({ ticketId, comments, canComment }: Props) {
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const { run, isPending, error } = useTicketAction();

  async function send() {
    if (await run(() => addComment({ ticketId, body, isPublic }))) setBody("");
  }

  return (
    <div className="flex flex-col gap-4">
      {canComment && (
        <div className="kr-surface flex flex-col gap-3 rounded-xl p-4">
          <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
            Comentario
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={isPublic}
                onCheckedChange={(v) => setIsPublic(v === true)}
              />
              Respuesta al cliente (cuenta como primera respuesta del SLA)
            </Label>
            <Button
              size="sm"
              onClick={send}
              disabled={isPending || body.trim().length === 0}
            >
              {isPending && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              Comentar
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      )}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin comentarios. Anota aquí lo que se habló con el cliente y lo que
          falta.
        </p>
      ) : (
        <ul className="kr-solid divide-y divide-border/60 rounded-xl">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 px-4 py-3">
              <PersonAvatar name={c.author.name} image={c.author.image} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{c.author.name}</span>
                  {c.isPublic && <Badge variant="outline">Al cliente</Badge>}
                  <time
                    dateTime={c.createdAt}
                    className="text-xs tabular-nums text-muted-foreground"
                  >
                    {formatDateTime(c.createdAt)}
                  </time>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
