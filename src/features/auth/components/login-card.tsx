// src/features/auth/components/login-card.tsx
// Tarjeta de vidrio del login: Microsoft como acción principal y el acceso de administrador
// como un despliegue discreto debajo.
"use client";

import { ChevronDown, KeyRound } from "lucide-react";
import { useState } from "react";
import { AdminSignInForm } from "./admin-sign-in-form";
import { AuthErrorAlert } from "./auth-error-alert";
import { MicrosoftSignInButton } from "./microsoft-sign-in-button";

type Props = {
  callbackURL: string;
  initialError: string | null;
};

export function LoginCard({ callbackURL, initialError }: Props) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [error, setError] = useState(initialError);

  return (
    <div className="kr-glass w-full max-w-100 rounded-2xl p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">
        Inicia sesión
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Usa tu cuenta de DIMA en Microsoft 365.
      </p>

      <div className="mt-6 grid gap-3">
        <AuthErrorAlert message={error} />
        <MicrosoftSignInButton callbackURL={callbackURL} onError={setError} />
      </div>

      <div className="mt-6 border-t border-border/70 pt-4">
        <button
          type="button"
          onClick={() => setIsAdminOpen((open) => !open)}
          aria-expanded={isAdminOpen}
          aria-controls="admin-access"
          className="flex w-full items-center gap-2 rounded-md py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <KeyRound className="size-4" aria-hidden="true" />
          Acceso de administrador
          <ChevronDown
            className="ml-auto size-4 transition-transform duration-200 ease-out data-[open=true]:rotate-180"
            data-open={isAdminOpen}
            aria-hidden="true"
          />
        </button>
        <div
          id="admin-access"
          inert={!isAdminOpen}
          className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-220 ease-out data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100 motion-reduce:transition-none"
          data-open={isAdminOpen}
        >
          <div className="-mx-0.5 min-h-0 overflow-hidden px-0.5 pb-0.5">
            <AdminSignInForm callbackURL={callbackURL} />
          </div>
        </div>
      </div>
    </div>
  );
}
