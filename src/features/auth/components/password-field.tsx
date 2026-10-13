// src/features/auth/components/password-field.tsx
// Campo de contraseña con botón para mostrarla u ocultarla.
"use client";

import { Eye, EyeOff } from "lucide-react";
import type { FocusEventHandler } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  error?: string;
  isRevealed: boolean;
  onRevealChange: (isRevealed: boolean) => void;
  onFocus: FocusEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
};

export function PasswordField({
  error,
  isRevealed,
  onRevealChange,
  onFocus,
  onBlur,
}: Props) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="admin-password">Contraseña</Label>
      <div className="relative">
        <Input
          id="admin-password"
          name="password"
          type={isRevealed ? "text" : "password"}
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "admin-password-error" : undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          className="h-10 bg-background/60 pr-11"
        />
        <button
          type="button"
          onClick={() => onRevealChange(!isRevealed)}
          aria-pressed={isRevealed}
          aria-label={isRevealed ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {isRevealed ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
      {error && (
        <p id="admin-password-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
