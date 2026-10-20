// src/features/tickets/components/attachments-panel.tsx
// Adjuntos del ticket: subir (hasta 20 MB), descargar con authz y quitar los propios mientras el ticket esté
// abierto (AGENTS.md §2.6, §5 "Detalle del ticket", ADR-16).
"use client";

import { Download, LoaderCircle, Paperclip, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { deleteTicketAttachment } from "../actions/delete-ticket-attachment";
import { uploadTicketAttachment } from "../actions/upload-ticket-attachment";
import type { AttachmentView } from "../types";
import { formatDateTime } from "./ticket-dates";
import { useTicketAction } from "./use-ticket-action";

type Props = {
  ticketId: string;
  attachments: AttachmentView[];
  canAttach: boolean;
  filesEnabled: boolean;
};

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function AttachmentsPanel({
  ticketId,
  attachments,
  canAttach,
  filesEnabled,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { run, isPending, error } = useTicketAction();

  async function upload(file: File) {
    const form = new FormData();
    form.set("ticketId", ticketId);
    form.set("file", file);
    await run(() => uploadTicketAttachment(form));
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {canAttach && filesEnabled && (
        <div className="kr-surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            Capturas, configuraciones o actas, hasta 20 MB por archivo.
          </p>
          <input
            ref={input}
            type="file"
            className="sr-only"
            id="ticket-file"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button onClick={() => input.current?.click()} disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Paperclip aria-hidden="true" />
            )}
            {isPending ? "Subiendo…" : "Subir archivo"}
          </Button>
        </div>
      )}
      {!filesEnabled && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Los adjuntos no están configurados. Pide al administrador que conecte
          la biblioteca de SharePoint.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin adjuntos. Sube aquí lo que el equipo necesite para atender el
          ticket.
        </p>
      ) : (
        <ul className="kr-solid divide-y divide-border/60 rounded-xl">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{a.fileName}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {sizeText(a.sizeBytes)} · {a.uploadedBy} ·{" "}
                  {formatDateTime(a.createdAt)}
                </span>
              </span>
              <a
                href={`/api/tickets/attachments/${a.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
              >
                <Download className="size-4" aria-hidden="true" />
                Descargar
              </a>
              {a.canDelete && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Quitar ${a.fileName}`}
                  disabled={isPending}
                  onClick={() =>
                    run(() => deleteTicketAttachment({ attachmentId: a.id }))
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
