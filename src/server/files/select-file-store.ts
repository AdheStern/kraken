// src/server/files/select-file-store.ts
// Elige dónde se guardan los adjuntos: SharePoint si está configurado; una carpeta local fuera de producción o
// si FILES_ROOT apunta a un montaje (ADR-16). null = adjuntos deshabilitados, con aviso en la interfaz.
import type { FileStore } from "./file-store";
import { LocalFileStore } from "./local-file-store";
import { SharePointFileStore } from "./sharepoint-file-store";

type Env = Record<string, string | undefined>;

const DEV_FILES_ROOT = ".files";

export function selectFileStore(env: Env = process.env): FileStore | null {
  const tenantId = env.ENTRA_TENANT_ID;
  const clientId = env.SHAREPOINT_CLIENT_ID;
  const clientSecret = env.SHAREPOINT_CLIENT_SECRET;
  const driveId = env.SHAREPOINT_DRIVE_ID;
  if (tenantId && clientId && clientSecret && driveId)
    return new SharePointFileStore({
      tenantId,
      clientId,
      clientSecret,
      driveId,
      folder: env.SHAREPOINT_FOLDER || "Kraken",
    });
  if (env.FILES_ROOT) return new LocalFileStore(env.FILES_ROOT);
  if (env.NODE_ENV !== "production") return new LocalFileStore(DEV_FILES_ROOT);
  return null;
}
