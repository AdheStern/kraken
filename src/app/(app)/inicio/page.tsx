// src/app/(app)/inicio/page.tsx
// Inicio provisional tras iniciar sesión, hasta que existan los tableros por rol (AGENTS.md §5 Navegación).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Inicio" };

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-9 w-72" />}>
        <Greeting />
      </Suspense>
      <p className="max-w-prose text-sm text-muted-foreground">
        Los tableros por rol llegan en las próximas fases. Mientras tanto,
        empieza por el Control de Venta.
      </p>
      <Button
        render={<Link href="/cv" />}
        nativeButton={false}
        className="w-fit"
      >
        Ir a Control de Venta
      </Button>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();
  const firstName = user.name.split(/\s+/)[0];
  return (
    <h1 className="text-2xl font-semibold tracking-[-0.02em]">
      Hola, {firstName}
    </h1>
  );
}
