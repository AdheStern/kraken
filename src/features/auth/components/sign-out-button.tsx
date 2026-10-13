// src/features/auth/components/sign-out-button.tsx
// Cierra la sesión de Better Auth y vuelve al login; `compact` muestra solo el ícono.
"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  async function signOut() {
    await authClient.signOut();
    window.location.assign("/login");
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={signOut}
        aria-label="Cerrar sesión"
        className="text-current hover:bg-sidebar-accent hover:text-current"
      >
        <LogOut aria-hidden="true" />
      </Button>
    );
  }
  return (
    <Button variant="outline" onClick={signOut}>
      <LogOut aria-hidden="true" />
      Cerrar sesión
    </Button>
  );
}
