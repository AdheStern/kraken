// src/features/sales-control/components/attachments/cv-attachments-panel.tsx
// Adjuntos del CV: la OC del cliente u otros documentos (un detalle referencial, una propuesta), hasta 20 MB cada
// uno, en SharePoint; se descargan con authz y los quita quien los subió o Administración (AGENTS.md §2.1, ADR-16).
"use client";

import { LoaderCircle, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import type { ActionResult } from "@/lib/action-result";
import { deleteCvAttachment } from "../../actions/delete-cv-attachment";
import { uploadCvAttachment } from "../../actions/upload-cv-attachment";
import type { CvAttachments, CvAttachmentView } from "../../types";
import { ATTACHMENT_KINDS, CvAttachmentList } from "./cv-attachment-list";

type Props = { cvId: string; attachments: CvAttachments };

export function CvAttachmentsPanel({ cvId, attachments }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<CvAttachmentView["kind"]>("OTRO");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAttach = attachments.canUpload && attachments.filesEnabled;

  async function run<T>(action: () => Promise<ActionResult<T>>) {
    setIsPending(true);
    setError(null);
    const result = await action();
    setIsPending(false);
    if (!result.ok) setError(result.error.message);
    router.refresh();
    return result.ok;
  }

  async function upload(files: FileList) {
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("cvId", cvId);
      form.set("kind", kind);
      form.set("file", file);
      if (!(await run(() => uploadCvAttachment(form)))) break;
    }
    if (input.current) input.current.value = "";
  }

  return (
    <section aria-labelledby="cv-adjuntos" className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="cv-adjuntos" className="mr-auto text-base font-semibold">
          Adjuntos
        </h2>
        {canAttach && (
          <>
            <OptionSelect
              aria-label="Tipo de adjunto"
              size="sm"
              value={kind}
              options={ATTACHMENT_KINDS}
              onValueChange={(next) =>
                next && setKind(next as CvAttachmentView["kind"])
              }
              className="h-8 w-40"
            />
            <input
              ref={input}
              type="file"
              multiple
              className="sr-only"
              aria-label="Archivos para adjuntar"
              onChange={(e) => e.target.files && upload(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => input.current?.click()}
              disabled={isPending}
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Paperclip aria-hidden="true" />
              )}
              {isPending ? "Subiendo…" : "Adjuntar"}
            </Button>
          </>
        )}
      </div>
      {attachments.canUpload && !attachments.filesEnabled && (
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
      {attachments.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canAttach
            ? "Sin adjuntos. Adjunta la OC del cliente o un detalle (por ejemplo, la conformación de las licencias) en Excel o PDF, hasta 20 MB."
            : "Este CV no tiene adjuntos."}
        </p>
      ) : (
        <CvAttachmentList
          items={attachments.items}
          isPending={isPending}
          onDelete={(id) => run(() => deleteCvAttachment({ attachmentId: id }))}
        />
      )}
    </section>
  );
}
