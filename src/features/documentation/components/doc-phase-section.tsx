// src/features/documentation/components/doc-phase-section.tsx
// Una fase de un proyecto como carpeta: sus documentos para descargar, el botón para subir (hasta 20 MB) y quitar
// los propios, y sus lecciones aprendidas (AGENTS.md §2.10, ADR-16).
"use client";

import {
  Download,
  FolderOpen,
  Lightbulb,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "../actions/delete-document";
import { uploadDocument } from "../actions/upload-document";
import type { DocPhaseView } from "../types";
import { DocLessonDialog } from "./lessons/doc-lesson-dialog";
import { DocLessonList } from "./lessons/doc-lesson-list";
import { phaseCountText } from "./phase-count-text";
import { useDocAction } from "./use-doc-action";

type Props = { projectId: string; phase: DocPhaseView; canUpload: boolean };

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function DocPhaseSection({ projectId, phase, canUpload }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { run, isPending, error } = useDocAction();
  const inputId = `doc-file-${phase.id}`;

  async function upload(files: FileList) {
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("phaseId", phase.id);
      form.set("file", file);
      if (!(await run(() => uploadDocument(form)))) break;
    }
    if (input.current) input.current.value = "";
  }

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="kr-surface grid gap-3 rounded-xl p-4"
    >
      <header className="flex flex-wrap items-center gap-2">
        <FolderOpen className="size-4 text-primary" aria-hidden="true" />
        <h2 id={`${inputId}-title`} className="font-medium">
          {phase.name}
        </h2>
        {!phase.isActive && <Badge variant="secondary">Dada de baja</Badge>}
        <span className="text-xs tabular-nums text-muted-foreground">
          {phaseCountText(phase)}
        </span>
        {phase.isActive && canUpload && (
          <div className="ml-auto flex flex-wrap gap-2">
            <DocLessonDialog
              mode="new"
              projectId={projectId}
              phaseId={phase.id}
              phaseName={phase.name}
              trigger={<Button size="sm" variant="outline" />}
              triggerLabel={
                <>
                  <Lightbulb aria-hidden="true" />
                  Lección aprendida
                </>
              }
            />
            <input
              ref={input}
              id={inputId}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files?.length && upload(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => input.current?.click()}
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload aria-hidden="true" />
              )}
              {isPending ? "Subiendo…" : "Subir documentos"}
            </Button>
          </div>
        )}
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {phase.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin documentos en esta fase. Sube actas, diseños o informes de hasta
          20 MB cada uno, o escribe una lección aprendida.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          {phase.documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.fileName}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {sizeText(d.sizeBytes)} · {d.uploadedBy} · {d.uploadedAt}
                </span>
              </span>
              <a
                href={`/api/documentation/documents/${d.id}`}
                className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
              >
                <Download className="size-4" aria-hidden="true" />
                Descargar
              </a>
              {d.canDelete && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Quitar ${d.fileName}`}
                  disabled={isPending}
                  onClick={() =>
                    run(() => deleteDocument({ documentId: d.id }))
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {phase.lessons.length > 0 && (
        <DocLessonList lessons={phase.lessons} isPhaseActive={phase.isActive} />
      )}
    </section>
  );
}
