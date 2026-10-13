// src/features/auth/components/auth-error-alert.tsx
// Mensaje de error del inicio de sesión; lo anuncia el lector de pantalla al aparecer.
import { CircleAlert } from "lucide-react";

export function AuthErrorAlert({ message }: { message: string | null }) {
  return (
    <div role="alert" aria-live="assertive">
      {message && (
        <p className="flex gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm leading-snug text-destructive">
          <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}
    </div>
  );
}
