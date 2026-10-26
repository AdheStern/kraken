// src/server/files/file-store.ts
// Contrato para guardar y leer adjuntos (ADR-16, patrón Adapter): SharePoint por Microsoft Graph en producción y
// una carpeta local en desarrollo, intercambiables (AGENTS.md §9 L).

// REGLA: un adjunto pesa hasta 20 MB; Next acepta el cuerpo con margen (next.config.ts).
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type StoredFile = { storagePath: string };

export interface FileStore {
  readonly name: "sharepoint" | "local";
  // POR QUÉ: `path` es una ruta lógica ("tickets/12/…"); cada adaptador devuelve la referencia que sabe leer.
  // REGLA: nunca reemplaza un archivo existente; si la ruta ya existe lanza FileConflictError.
  put(path: string, data: Uint8Array, mimeType: string): Promise<StoredFile>;
  get(storagePath: string): Promise<Uint8Array>;
  remove(storagePath: string): Promise<void>;
}

export class FileStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileStoreError";
  }
}

// POR QUÉ: la documentación usa nombres legibles (§2.10); quien sube elige otro nombre en vez de pisar un archivo.
export class FileConflictError extends FileStoreError {
  constructor(path: string) {
    super(`Ya existe un archivo en ${path}.`);
    this.name = "FileConflictError";
  }
}
