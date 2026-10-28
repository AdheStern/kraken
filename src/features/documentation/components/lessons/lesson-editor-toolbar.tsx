// src/features/documentation/components/lessons/lesson-editor-toolbar.tsx
// Barra de formato del editor de lecciones aprendidas: negrita, cursiva, títulos, listas, cita y deshacer.
"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tool = {
  label: string;
  icon: LucideIcon;
  isActive?: (e: Editor) => boolean;
  run: (e: Editor) => void;
};

const TOOLS: Tool[][] = [
  [
    {
      label: "Negrita",
      icon: Bold,
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursiva",
      icon: Italic,
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: "Tachado",
      icon: Strikethrough,
      isActive: (e) => e.isActive("strike"),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      label: "Encabezado",
      icon: Heading2,
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subencabezado",
      icon: Heading3,
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      label: "Lista con viñetas",
      icon: List,
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Cita",
      icon: Quote,
      isActive: (e) => e.isActive("blockquote"),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
  ],
  [
    {
      label: "Deshacer",
      icon: Undo2,
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      label: "Rehacer",
      icon: Redo2,
      run: (e) => e.chain().focus().redo().run(),
    },
  ],
];

export function LessonEditorToolbar({ editor }: { editor: Editor }) {
  // POR QUÉ: el editor no vuelve a renderizar la barra por sí solo; se observa solo qué marcas están activas.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      Object.fromEntries(
        TOOLS.flat().map((tool) => [tool.label, tool.isActive?.(e) ?? false]),
      ),
  });
  return (
    <div
      role="toolbar"
      aria-label="Formato de la lección"
      className="flex flex-wrap items-center gap-0.5 border-b border-border/60 p-1"
    >
      {TOOLS.map((group, g) => (
        <div
          key={group[0]?.label}
          className={g > 0 ? "flex border-l border-border/60 pl-0.5" : "flex"}
        >
          {group.map((tool) => {
            const pressed = active[tool.label] ?? false;
            const Icon = tool.icon;
            return (
              <Button
                key={tool.label}
                type="button"
                size="icon-sm"
                variant={pressed ? "secondary" : "ghost"}
                aria-label={tool.label}
                title={tool.label}
                aria-pressed={tool.isActive ? pressed : undefined}
                // TRAMPA: sin esto el botón se queda con el foco y lo que se escribe después no llega al editor.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => tool.run(editor)}
              >
                <Icon aria-hidden="true" />
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
