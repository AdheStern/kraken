// src/features/inventory/components/pos-scanner.tsx
// Campo de escaneo del POS: el lector actúa como teclado y termina con Enter; tras cada lectura dice qué entró o
// por qué no, y el foco vuelve al campo.
"use client";

import { ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = { onScan: (text: string) => { ok: boolean; message: string } };

export function PosScanner({ onScan }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  return (
    <form
      className="grid gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(onScan(value));
        setValue("");
        ref.current?.focus();
      }}
    >
      <div className="relative">
        <ScanLine
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Escanea el serial o el código"
          aria-label="Escanear serial o código"
          className="h-14 pl-12 font-mono text-lg"
        />
      </div>
      <p
        aria-live="polite"
        className={cn(
          "min-h-5 text-sm",
          feedback?.ok === false ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {feedback?.message}
      </p>
    </form>
  );
}
