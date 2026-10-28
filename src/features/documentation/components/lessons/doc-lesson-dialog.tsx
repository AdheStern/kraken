// src/features/documentation/components/lessons/doc-lesson-dialog.tsx
// Escribir una lección aprendida nueva o abrir una existente para leerla y editarla (AGENTS.md §2.10).
"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactElement, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDocLesson } from "../../actions/create-doc-lesson";
import { updateDocLesson } from "../../actions/update-doc-lesson";
import type { DocLessonView } from "../../types";
import { useDocAction } from "../use-doc-action";
import { LessonEditor } from "./lesson-editor";

type Props = { trigger: ReactElement; triggerLabel: React.ReactNode } & (
  | { mode: "new"; projectId: string; phaseId: string; phaseName: string }
  | { mode: "edit"; lesson: DocLessonView; readOnly: boolean }
);

type Loaded = { markdown: string; version: string | null };

export function DocLessonDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [markdown, setMarkdown] = useState("");
  const { run, isPending, error, setError } = useDocAction();
  const labelId = useId();
  const readOnly = props.mode === "edit" && props.readOnly;

  async function openChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setError(null);
    setLoaded(null);
    if (props.mode === "new") {
      setTitle("");
      setMarkdown("");
      return setLoaded({ markdown: "", version: null });
    }
    const content = await loadLesson(props.lesson.id);
    if (!content)
      return setError("No se pudo abrir la lección. Intenta en unos minutos.");
    setMarkdown(content.markdown);
    setLoaded(content);
  }

  async function save() {
    const saved = await run<unknown>(() =>
      props.mode === "new"
        ? createDocLesson({
            projectId: props.projectId,
            phaseId: props.phaseId,
            title,
            markdown,
          })
        : updateDocLesson({
            documentId: props.lesson.id,
            baseVersion: loaded?.version ?? "",
            markdown,
          }),
    );
    if (saved) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger render={props.trigger}>{props.triggerLabel}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {props.mode === "new"
              ? "Nueva lección aprendida"
              : props.lesson.title}
          </DialogTitle>
          <DialogDescription>
            {props.mode === "new"
              ? `Se guarda como un .txt en la carpeta «${props.phaseName}».`
              : `${props.lesson.author} · ${props.lesson.lastEdit}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {props.mode === "new" && (
            <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
              Título
              <Input
                value={title}
                maxLength={120}
                placeholder="Ej.: Validar la energía del rack antes del corte"
                onChange={(event) => setTitle(event.target.value)}
              />
            </Label>
          )}
          <span id={labelId} className="text-[13px] text-muted-foreground">
            {readOnly
              ? "Lección (fase dada de baja: solo lectura)"
              : "Qué pasó, qué aprendimos y qué haremos distinto"}
          </span>
          {loaded ? (
            <LessonEditor
              labelledBy={labelId}
              initialMarkdown={loaded.markdown}
              readOnly={readOnly}
              onChange={setMarkdown}
            />
          ) : (
            !error && (
              <LoaderCircle
                className="mx-auto my-16 animate-spin text-muted-foreground"
                aria-label="Abriendo la lección"
              />
            )
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        {!readOnly && (
          <DialogFooter>
            <Button
              onClick={save}
              disabled={isPending || !loaded || markdown.trim() === ""}
            >
              {isPending && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              Guardar lección
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// POR QUÉ: la versión es la que de verdad se abrió (ETag de la descarga), no la de la página, que puede estar vieja.
async function loadLesson(id: string): Promise<Loaded | null> {
  const response = await fetch(`/api/documentation/documents/${id}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const version = response.headers.get("etag")?.replaceAll('"', "") ?? null;
  return { markdown: await response.text(), version };
}
