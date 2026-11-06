// src/features/sales-control/components/lines/use-save-shortcuts.ts
// Ctrl+S (o Cmd+S) guarda y el navegador avisa antes de salir con cambios sin guardar.
"use client";

import { useEffect } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";

export function useSaveShortcuts(onSave: () => void, isDirty: boolean) {
  useShortcuts({ "cv.save": onSave });
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [isDirty]);
}
