// src/server/files/attachment-disposition.ts
// Cabecera content-disposition de una descarga: nombre ASCII de respaldo y el nombre real en UTF-8 (RFC 6266).
// TRAMPA: un nombre con comillas, saltos de línea o tildes armado a mano rompe la cabecera o la deja inyectable.

export function attachmentDisposition(fileName: string): string {
  const fallback = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
