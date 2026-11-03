// src/features/tickets/components/customer-ticket-reply.tsx
// Respuesta de la cuenta de un cliente en su ticket: un comentario (siempre público) y adjuntos de cualquier tipo,
// hasta 20 MB cada uno (AGENTS.md §2.11, ADR-16). Solo si su empresa lo permite.
"use client";

import { LoaderCircle, Paperclip, Send } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "../actions/add-comment";
import { uploadTicketAttachment } from "../actions/upload-ticket-attachment";
import { useTicketAction } from "./use-ticket-action";

export function CustomerTicketReply({
  ticketId,
  filesEnabled,
}: {
  ticketId: string;
  filesEnabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const { run, isPending, error } = useTicketAction();

  async function upload(file: File) {
    const form = new FormData();
    form.set("ticketId", ticketId);
    form.set("file", file);
    await run(() => uploadTicketAttachment(form));
    if (input.current) input.current.value = "";
  }

  return (
    <form
      className="kr-surface grid gap-3 rounded-xl p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await run(() =>
          addComment({ ticketId, body, isPublic: true }),
        );
        if (ok) setBody("");
      }}
    >
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe a DIMA: lo verá el equipo que atiende tu ticket."
        aria-label="Comentario"
      />
      <div className="flex flex-wrap items-center gap-2">
        {filesEnabled && (
          <>
            <input
              ref={input}
              type="file"
              className="sr-only"
              aria-label="Elegir un archivo"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => input.current?.click()}
            >
              <Paperclip aria-hidden="true" />
              Adjuntar archivo
            </Button>
          </>
        )}
        <Button
          type="submit"
          size="sm"
          className="ml-auto"
          disabled={isPending || body.trim() === ""}
        >
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Enviar comentario
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
