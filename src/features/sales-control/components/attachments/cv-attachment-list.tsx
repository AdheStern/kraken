// src/features/sales-control/components/attachments/cv-attachment-list.tsx
// Lista de adjuntos del CV: tipo, tamaño, versión en que se subió, quién y cuándo; descargar y quitar.
"use client";

import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvAttachmentView } from "../../types";

export const ATTACHMENT_KINDS: {
  id: CvAttachmentView["kind"];
  label: string;
}[] = [
  { id: "OTRO", label: "Documento" },
  { id: "OC_CLIENTE", label: "OC del cliente" },
];

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

type Props = {
  items: CvAttachmentView[];
  isPending: boolean;
  onDelete: (id: string) => void;
};

export function CvAttachmentList({ items, isPending, onDelete }: Props) {
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{a.fileName}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {ATTACHMENT_KINDS.find((k) => k.id === a.kind)?.label} ·{" "}
              {sizeText(a.sizeBytes)} ·{" "}
              {a.versionLabel ? `${a.versionLabel} · ` : ""}
              {a.uploadedBy} · {dateTime.format(new Date(a.createdAt))}
            </span>
          </span>
          <a
            href={`/api/cv/attachments/${a.id}`}
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
              onClick={() => onDelete(a.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
