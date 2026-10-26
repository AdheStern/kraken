// src/server/files/safe-file-name.ts
// Nombres de archivo y de carpeta que SharePoint y Windows aceptan (ADR-16).

const FORBIDDEN = /[:*?"<>|#%]/g;

// TRAMPA: el nombre llega del navegador; se quitan rutas y caracteres que SharePoint o Windows rechazan.
export function toSafeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "archivo";
  const clean = base.replace(FORBIDDEN, "_").trim();
  return (clean || "archivo").slice(-150);
}

// TRAMPA: un segmento de carpeta (cliente, proyecto, fase) no puede llevar barras ni terminar en punto o espacio.
export function toSafeFolderName(name: string): string {
  const clean = name
    .replace(/[\\/]/g, "-")
    .replace(FORBIDDEN, "_")
    .trim()
    .replace(/[.\s]+$/, "");
  return (clean || "sin nombre").slice(0, 80).trim();
}
