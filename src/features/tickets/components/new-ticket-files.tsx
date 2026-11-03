// src/features/tickets/components/new-ticket-files.tsx
// Adjuntos del alta de ticket: cualquier tipo de archivo, varios, hasta 20 MB cada uno; se suben al crear el
// ticket (AGENTS.md §2.6, ADR-16).
"use client";

import { Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 20 * 1024 * 1024;

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
};

export function NewTicketFiles({ files, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const tooBig = files.filter((file) => file.size > MAX_BYTES);

  return (
    <div className="grid gap-2 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Adjuntos</span>
        <span className="mr-auto text-xs text-muted-foreground">
          Cualquier tipo de archivo, hasta 20 MB cada uno.
        </span>
        <input
          ref={input}
          type="file"
          multiple
          className="sr-only"
          aria-label="Elegir adjuntos"
          onChange={(e) => {
            onChange([...files, ...Array.from(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          <Paperclip aria-hidden="true" />
          Adjuntar
        </Button>
      </div>
      {files.length > 0 && (
        <ul className="grid gap-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Quitar ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {tooBig.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Pesan más de 20 MB: {tooBig.map((f) => f.name).join(", ")}. Quítalos o
          comprímelos.
        </p>
      )}
    </div>
  );
}

export function hasOversizedFiles(files: File[]): boolean {
  return files.some((file) => file.size > MAX_BYTES);
}
