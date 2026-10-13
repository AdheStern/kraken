// src/features/auth/components/sign-out-button.tsx
// Cierra la sesión de Better Auth y vuelve al login.
"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  async function signOut() {
    await authClient.signOut();
    window.location.assign("/login");
  }

  return (
    <Button variant="outline" onClick={signOut}>
      <LogOut aria-hidden="true" />
      Cerrar sesión
    </Button>
  );
}
