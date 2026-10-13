// src/app/page.tsx
// Inicio provisional tras iniciar sesión, hasta que existan los tableros por rol (AGENTS.md §5 Navegación).
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-4xl tracking-[-0.02em] text-primary">
        Kraken
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Sesión iniciada. Los tableros por rol llegan en las próximas fases.
      </p>
      <SignOutButton />
    </main>
  );
}
