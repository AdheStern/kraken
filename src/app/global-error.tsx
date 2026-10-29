// src/app/global-error.tsx
// Error que tumba el layout raíz: reemplaza la página 500 de Next (en inglés y sin idioma) por una en español
// que deja reintentar (AGENTS.md §5, errores que dicen qué hacer). El detalle queda en el log con su digest.
"use client";

import { RotateCcw } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import "./globals.css";

type Props = { error: Error & { digest?: string }; reset: () => void };

// TRAMPA: reemplaza al layout raíz, así que lleva su propio <html> y <body>; no admite metadata.
export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="es">
      <body className="min-h-full">
        <title>Error · Kraken</title>
        <main className="kr-ground flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
          <KrakenEmpty mood="curious" title="Kraken no pudo cargar.">
            Vuelve a intentarlo en unos segundos. Si sigue pasando, avisa al
            administrador del sistema
            {error.digest ? ` con este código: ${error.digest}` : ""}.
          </KrakenEmpty>
          <Button onClick={reset} className="self-center">
            <RotateCcw aria-hidden="true" />
            Reintentar
          </Button>
        </main>
      </body>
    </html>
  );
}
