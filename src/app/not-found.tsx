// src/app/not-found.tsx
// Dirección que no corresponde a ninguna pantalla, fuera del marco de la app: en español y con salida.
import type { Metadata } from "next";
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function RootNotFound() {
  return (
    <main className="kr-ground flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <KrakenEmpty mood="curious" title="Esta dirección no existe en Kraken.">
        Revisa el enlace o entra por el inicio.
      </KrakenEmpty>
      <Link href="/inicio" className={buttonVariants()}>
        Ir al inicio
      </Link>
    </main>
  );
}
