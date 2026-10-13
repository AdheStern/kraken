// src/features/auth/components/admin-sign-in-form.tsx
// Acceso con correo y contraseña de la cuenta de emergencia del administrador del sistema.
// POR QUÉ: va por /api/auth (no por Server Action) para que aplique el límite de intentos de Better Auth.
"use client";

import { LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { adminSignInSchema } from "../schemas/admin-sign-in-schema";
import { toAdminSignInMessage } from "../sign-in-errors";
import { AuthErrorAlert } from "./auth-error-alert";
import { useKrakenMood } from "./kraken-mood";
import { PasswordField } from "./password-field";

type FieldErrors = { email?: string; password?: string };

export function AdminSignInForm({ callbackURL }: { callbackURL: string }) {
  const { setMood } = useKrakenMood();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = adminSignInSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      setMood("error");
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setIsPending(true);
    const { error } = await authClient.signIn.email(parsed.data);
    if (error) {
      setIsPending(false);
      setFormError(toAdminSignInMessage(error));
      setMood("error");
      return;
    }
    // POR QUÉ: navegación completa para que el proxy vea la cookie de sesión recién creada.
    window.location.assign(callbackURL);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4 pt-4">
      <AuthErrorAlert message={formError} />
      <div className="grid gap-2">
        <Label htmlFor="admin-email">Correo</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "admin-email-error" : undefined}
          onFocus={() => setMood("idle")}
          className="h-10 bg-background/60"
        />
        {fieldErrors.email && (
          <p id="admin-email-error" className="text-sm text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>
      <PasswordField
        error={fieldErrors.password}
        isRevealed={isRevealed}
        onRevealChange={(next) => {
          setIsRevealed(next);
          setMood(next ? "peek" : "shy");
        }}
        onFocus={() => setMood(isRevealed ? "peek" : "shy")}
        onBlur={() => setMood("idle")}
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={isPending}
        className="h-10 w-full text-sm"
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        {isPending ? "Verificando…" : "Entrar"}
      </Button>
    </form>
  );
}
