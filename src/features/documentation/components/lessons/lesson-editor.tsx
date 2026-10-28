// src/features/documentation/components/lessons/lesson-editor.tsx
// Editor enriquecido de una lección aprendida (Tiptap): lee y entrega Markdown, que es lo que se guarda en su .txt
// (AGENTS.md §2.10).
"use client";

import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LessonEditorToolbar } from "./lesson-editor-toolbar";

type Props = {
  labelledBy: string;
  initialMarkdown: string;
  readOnly?: boolean;
  onChange: (markdown: string) => void;
};

// POR QUÉ: sin plugin de tipografía; estos estilos dan forma solo al contenido del editor.
const CONTENT_CLASS =
  "min-h-64 max-h-[55vh] overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline";

export function LessonEditor({
  labelledBy,
  initialMarkdown,
  readOnly = false,
  onChange,
}: Props) {
  const editor = useEditor({
    // TRAMPA: con render en servidor, Tiptap pide no crear el editor hasta montarse en el navegador.
    immediatelyRender: false,
    editable: !readOnly,
    // REGLA: solo marcas que el Markdown del .txt sabe escribir; el subrayado no existe en Markdown.
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false,
        link: { openOnClick: readOnly, autolink: true },
      }),
      Markdown,
    ],
    content: initialMarkdown,
    contentType: "markdown",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        "aria-readonly": String(readOnly),
        class: CONTENT_CLASS,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
  });

  return (
    <div className="rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {!readOnly && editor && <LessonEditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
