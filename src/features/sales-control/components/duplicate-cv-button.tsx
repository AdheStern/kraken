// src/features/sales-control/components/duplicate-cv-button.tsx
// Botón "Duplicar": crea un CV nuevo con las mismas líneas y abre su editor.
"use client";

import { Copy, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { duplicateCv } from "../actions/duplicate-cv";

export function DuplicateCvButton({ cvId }: { cvId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function duplicate() {
    setIsPending(true);
    setError(null);
    const result = await duplicateCv(cvId);
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    router.push(`/cv/${result.data.cvId}`);
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={duplicate}
        disabled={isPending}
        title="Número nuevo, mismas líneas, fecha de hoy"
      >
        {isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        {isPending ? "Duplicando…" : "Duplicar"}
      </Button>
    </div>
  );
}
