// src/features/sales-control/components/lines/use-save-shortcuts.ts
// Ctrl+S (o Cmd+S) guarda y el navegador avisa antes de salir con cambios sin guardar.
"use client";

import { useEffect } from "react";

export function useSaveShortcuts(onSave: () => void, isDirty: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [onSave, isDirty]);
}
