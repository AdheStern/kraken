// src/features/auth/components/microsoft-sign-in-button.tsx
// Botón principal del login: redirige a Entra ID (Microsoft 365 de DIMA) con Better Auth.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toOAuthErrorMessage } from "../sign-in-errors";
import { useKrakenMood } from "./kraken-mood";
import { MicrosoftLogo } from "./microsoft-logo";

type Props = {
  callbackURL: string;
  onError: (message: string) => void;
};

export function MicrosoftSignInButton({ callbackURL, onError }: Props) {
  const { setMood } = useKrakenMood();
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function signIn() {
    setIsRedirecting(true);
    setMood("loading");
    const { error } = await authClient.signIn.social({
      provider: "microsoft",
      callbackURL,
      errorCallbackURL: "/login",
    });
    // POR QUÉ: si hubo redirección la página ya se fue; solo volvemos aquí cuando falló.
    if (error) {
      setIsRedirecting(false);
      setMood("error");
      onError(toOAuthErrorMessage(error.code ?? ""));
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={isRedirecting}
      aria-busy={isRedirecting}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#8c8c8c] bg-white px-4 text-[15px] font-semibold text-[#5e5e5e] shadow-sm transition-[background-color,box-shadow,transform] duration-150 outline-none hover:bg-[#f3f3f3] focus-visible:ring-3 focus-visible:ring-ring/60 active:translate-y-px disabled:cursor-progress disabled:opacity-80 dark:border-transparent dark:bg-[#2f2f2f] dark:text-white dark:hover:bg-[#3a3a3a]"
    >
      {isRedirecting ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <MicrosoftLogo className="size-5" />
      )}
      {isRedirecting
        ? "Redirigiendo a Microsoft…"
        : "Iniciar sesión con Microsoft"}
    </button>
  );
}
