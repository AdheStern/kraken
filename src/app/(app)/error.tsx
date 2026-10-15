// src/app/(app)/error.tsx
// Error inesperado al mostrar una pantalla: lo dice en claro, deja reintentar y no muestra detalles técnicos
// (AGENTS.md §5, errores que dicen qué hacer). El detalle queda en el log del servidor con su digest.
"use client";

import { RotateCcw } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";

type Props = { error: Error & { digest?: string }; reset: () => void };

export default function AppError({ error, reset }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <KrakenEmpty mood="curious" title="Algo falló al mostrar esta pantalla.">
        Vuelve a intentarlo en unos segundos. Si sigue pasando, avisa al
        administrador del sistema
        {error.digest ? ` con este código: ${error.digest}` : ""}.
      </KrakenEmpty>
      <Button onClick={reset} className="self-center">
        <RotateCcw aria-hidden="true" />
        Reintentar
      </Button>
    </main>
  );
}
