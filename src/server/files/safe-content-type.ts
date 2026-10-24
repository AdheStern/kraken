// src/server/files/safe-content-type.ts
// Tipo con el que se descarga un adjunto: el que declaró el navegador solo si es un formato pasivo conocido; lo
// demás (HTML, SVG, scripts) se entrega como binario (ADR-16).
// TRAMPA: el tipo lo escribe el cliente al subir; servirlo tal cual permitiría ejecutar HTML en nuestro origen.

const PASSIVE_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-outlook",
  "message/rfc822",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const OFFICE_PREFIX = "application/vnd.openxmlformats-officedocument.";

export function safeContentType(declared: string): string {
  const type = declared.split(";")[0]?.trim().toLowerCase() ?? "";
  if (PASSIVE_TYPES.has(type) || type.startsWith(OFFICE_PREFIX)) return type;
  return "application/octet-stream";
}
