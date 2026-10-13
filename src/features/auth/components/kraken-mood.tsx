// src/features/auth/components/kraken-mood.tsx
// Estado compartido entre el formulario y la mascota: el kraken reacciona a lo que hace la persona.
"use client";

import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

const ERROR_REACTION_MS = 900;

export type KrakenMood = "idle" | "shy" | "peek" | "error" | "loading";

type KrakenMoodContextValue = {
  mood: KrakenMood;
  setMood: (mood: KrakenMood) => void;
};

const KrakenMoodContext = createContext<KrakenMoodContextValue | null>(null);

export function KrakenMoodProvider({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [mood, setMood] = useState<KrakenMood>("idle");
  const value = useMemo(() => ({ mood, setMood }), [mood]);

  // POR QUÉ: el error es una reacción, no un estado; al volver a "idle" el siguiente error sacude otra vez.
  useEffect(() => {
    if (mood !== "error") return;
    const timeout = setTimeout(() => setMood("idle"), ERROR_REACTION_MS);
    return () => clearTimeout(timeout);
  }, [mood]);

  return (
    <KrakenMoodContext value={value}>
      <div data-mood={mood} className={className}>
        {children}
      </div>
    </KrakenMoodContext>
  );
}

export function useKrakenMood(): KrakenMoodContextValue {
  const context = use(KrakenMoodContext);
  if (!context) {
    throw new Error("useKrakenMood requiere un KrakenMoodProvider.");
  }
  return context;
}
