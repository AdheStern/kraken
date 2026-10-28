// src/features/documentation/components/lessons/doc-lesson-list.tsx
// Lecciones aprendidas de una fase: abrir para leer y editar, descargar su .txt y quitar las propias
// (AGENTS.md §2.10).
"use client";

import { Download, Lightbulb, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "../../actions/delete-document";
import type { DocLessonView } from "../../types";
import { useDocAction } from "../use-doc-action";
import { DocLessonDialog } from "./doc-lesson-dialog";

type Props = { lessons: DocLessonView[]; isPhaseActive: boolean };

export function DocLessonList({ lessons, isPhaseActive }: Props) {
  const { run, isPending, error } = useDocAction();
  return (
    <div className="grid gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Lecciones aprendidas
      </h3>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
        {lessons.map((lesson) => (
          <li
            key={lesson.id}
            className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
          >
            <Lightbulb
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <DocLessonDialog
                mode="edit"
                lesson={lesson}
                readOnly={!isPhaseActive}
                trigger={
                  <button
                    type="button"
                    className="block max-w-full truncate text-left font-medium underline-offset-4 hover:underline"
                  />
                }
                triggerLabel={lesson.title}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {lesson.author} · {lesson.lastEdit}
              </span>
            </span>
            <a
              href={`/api/documentation/documents/${lesson.id}`}
              aria-label={`Descargar ${lesson.title}`}
              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
            >
              <Download className="size-4" aria-hidden="true" />
              .txt
            </a>
            {lesson.canDelete && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Quitar ${lesson.title}`}
                disabled={isPending}
                onClick={() =>
                  run(() => deleteDocument({ documentId: lesson.id }))
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
